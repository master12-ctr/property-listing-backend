import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request, 
  ValidationPipe,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from 'src/roles/dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIs...',
        user: {
          id: '65b3f8a9e4b01234abcd5678',
          name: 'John Doe',
          email: 'john@example.com',
          permissions: ['property.read.own'],
          tenantId: '65b3f8a9e4b01234abcd5679'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIs...',
        user: {
          id: '65b3f8a9e4b01234abcd5678',
          name: 'John Doe',
          email: 'john@example.com',
          permissions: ['property.read.own'],
          tenantId: '65b3f8a9e4b01234abcd5679'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error or user already exists' })
  async register(@Body(new ValidationPipe({ 
    whitelist: true,
    forbidNonWhitelisted: true 
  })) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }



  @Post('refresh')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Refresh access token' })
@ApiBody({ 
  schema: {
    type: 'object',
    properties: {
      refreshToken: { type: 'string' }
    }
  }
})
@ApiResponse({ 
  status: 200, 
  description: 'Token refreshed successfully',
  schema: {
    example: {
      access_token: 'eyJhbGciOiJIUzI1NiIs...',
      user: {
        id: '65b3f8a9e4b01234abcd5678',
        name: 'John Doe',
        email: 'john@example.com',
        permissions: ['property.read.own'],
        tenantId: '65b3f8a9e4b01234abcd5679'
      }
    }
  }
})
@ApiResponse({ status: 401, description: 'Invalid refresh token' })
async refresh(@Body() body: { refreshToken: string }) {
  return this.authService.refreshToken(body.refreshToken);
}
}