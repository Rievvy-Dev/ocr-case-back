import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
@ApiTags('Auth') 
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'senha123' },
        name: { type: 'string', example: 'Usuário Teste' },
      },
    },
  })
  async register(@Body() data: { email: string; password: string; name?: string }) {
    return this.authService.register(data.email, data.password, data.name);
  }

  @Post('login')
  @ApiOperation({ summary: 'Autenticar um usuário' })
  @ApiResponse({ status: 200, description: 'Token JWT retornado com sucesso.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'senha123' },
      },
    },
  })
  async login(@Body() data: { email: string; password: string }) {
    return this.authService.login(data.email, data.password);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  async getUser(@Req() req) {
    return this.authService.getUser(req.user.sub);
  }
}