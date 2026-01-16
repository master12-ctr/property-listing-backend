import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { RolesModule } from 'src/roles/roles.module';

@Module({
  imports: [
    UsersModule,
     RolesModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          console.warn('WARNING: JWT_SECRET not found in environment variables. Using fallback secret.');
          return {
            secret: 'fallback-secret-key-change-this-in-production',
            signOptions: { 
              expiresIn: configService.get<string>('JWT_EXPIRATION', '7d') as any
            },
          };
        }
        const expiresIn = configService.get<string>('JWT_EXPIRATION', '7d');
        return {
          secret,
          signOptions: { 
            expiresIn: expiresIn as any 
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}