import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(email: string, password: string, name?: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        throw new Error("E-mail já cadastrado.");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await this.prisma.user.create({
        data: { email, password: hashedPassword, name },
      });

      return this.createToken(user);
    } catch (error) {
      throw new Error("Erro ao registrar usuário.");
    }
  }

  async login(email: string, password: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new UnauthorizedException("Credenciais inválidas.");
      }

      return this.createToken(user);
    } catch (error) {
      throw new Error("Erro ao autenticar usuário.");
    }
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true }, // Nunca retorne a senha!
    });

    if (!user) {
      throw new UnauthorizedException("Usuário não encontrado.");
    }

    return user;
  }

  private createToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
