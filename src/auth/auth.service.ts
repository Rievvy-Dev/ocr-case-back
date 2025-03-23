import { Injectable } from '@nestjs/common';
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
      if (error.code === "P2002") {
        throw new Error("Este e-mail já está em uso.");
      }
      throw new Error("Erro ao registrar usuário.");
    }
  }

  async login(email: string, password: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        throw new Error("Credenciais inválidas.");
      }

      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!passwordMatches) {
        throw new Error("Credenciais inválidas.");
      }

      return this.createToken(user);
    } catch (error) {
      throw new Error("Erro ao autenticar usuário.");
    }
  }

  async getUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  }

  private createToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
