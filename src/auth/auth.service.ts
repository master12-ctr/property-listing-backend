
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
      // Use toJSON instead of toSafeObject
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
    
    const payload = { 
      email: user.email, 
      sub: user._id,
      permissions,
      tenantId: user.tenant?.toString() || user.tenantId,
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        permissions,
        tenantId: user.tenant?.toString() || user.tenantId,
      },
    };
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