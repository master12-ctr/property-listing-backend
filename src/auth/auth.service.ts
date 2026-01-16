import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

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
      const safeUser = user.toSafeObject();
      return {
        ...safeUser,
        permissions,
      };
    }
    return null;
  }

  async login(user: any) {
    // Get fresh permissions
    const permissions = await this.usersService.getUserPermissions(user._id);
    
    const payload = { 
      email: user.email, 
      sub: user._id,
      permissions,
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        permissions,
      },
    };
  }

  async register(registerDto: any) {
    // If roleName is provided, use it, otherwise UsersService will assign default role
    const user = await this.usersService.create(registerDto);
    
    // Get permissions for the created user
    const permissions = await this.usersService.getUserPermissions(user._id.toString());
    const safeUser = user.toSafeObject();
    
    return this.login({
      ...safeUser,
      permissions,
      _id: user._id.toString(),
    });
  }
}