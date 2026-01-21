  
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterDto } from 'src/roles/dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

async validateUser(email: string, password: string): Promise<any> {
  const user = await this.usersService.validateUser(email, password);
  
  if (user) {
    const permissions = await this.usersService.getUserPermissions(user._id.toString());
    
    console.log(`Auth validateUser: User ${user.email} has permissions:`, permissions);
    
    const safeUser = user.toJSON ? user.toJSON() : this.toSafeUser(user);
    return {
      ...safeUser,
      permissions,
    };
  }
  return null;
}

async login(user: any) {
  const permissions = await this.usersService.getUserPermissions(user._id);
  
  console.log(`Auth login: User ${user.email} permissions:`, permissions);
  
  const payload = { 
    email: user.email, 
    sub: user._id,
    permissions,
    tenantId: user.tenant?.toString() || user.tenantId,
  };
  
  const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
  const refresh_token = this.jwtService.sign(
    { sub: user._id }, 
    { expiresIn: '7d' }
  );
  
  await this.usersService.update(user._id, { refreshToken: refresh_token });
  
  return {
    access_token,
    refresh_token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      permissions, // Make sure permissions are included
      tenantId: user.tenant?.toString() || user.tenantId,
    },
  };
}

  


  async refreshToken(refreshToken: string) {
  try {
    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_SECRET,
    });
    
    const user = await this.usersService.findById(payload.sub);
    
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    const permissions = await this.usersService.getUserPermissions(user._id.toString());
    
    // Generate new tokens
    const newAccessToken = this.jwtService.sign(
      { 
        email: user.email, 
        sub: user._id,
        permissions,
        tenantId: user.tenant?.toString() || user.tenant,
      },
      { expiresIn: '15m' }
    );
    
    const newRefreshToken = this.jwtService.sign(
      { sub: user._id },
      { expiresIn: '7d' }
    );
    
    // Update refresh token in database (token rotation)
    await this.usersService.updateRefreshToken(user._id.toString(), newRefreshToken);
    
    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        permissions,
        tenantId: user.tenant?.toString() || user.tenant,
      },
    };
  } catch (error) {
    throw new UnauthorizedException('Invalid refresh token');
  }
}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Convert RegisterDto to CreateUserDto
    const createUserDto: CreateUserDto = {
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      metadata: {
        phone: registerDto.phone,
        company: registerDto.company,
      },
    };

    // Create user with default role
    const user = await this.usersService.create(createUserDto);
    
    // Get permissions for the created user
    const permissions = await this.usersService.getUserPermissions(user._id.toString());
    
    // Use toJSON or custom method
    const safeUser = user.toJSON ? user.toJSON() : this.toSafeUser(user);
    
    return this.login({
      ...safeUser,
      permissions,
      _id: user._id.toString(),
      tenant: user.tenant,
    });
  }

  private toSafeUser(user: any): any {
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.__v;
    if (safeUser._id && safeUser._id.toString) {
      safeUser._id = safeUser._id.toString();
    }
    return safeUser;
  }
}