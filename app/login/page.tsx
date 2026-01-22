'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/app/components/ui';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo Section */}
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-24 mb-6">
            <Image 
              src="/logored.png" 
              alt="PG Repense Logo" 
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 text-center">
            Bem-vindo ao PG Repense
          </h1>
          <p className="mt-2 text-center text-muted-foreground">
            Selecione seu tipo de acesso para continuar
          </p>
        </div>

        {/* Role Selection Buttons */}
        <div className="mt-10 space-y-4">
          {/* Teacher/Leader Option */}
          <Link href="/teacher/login" className="block group">
            <Card 
              hoverable 
              className="relative overflow-hidden border-2 transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-md"
              padding="lg"
            >
              <div className="flex items-center space-x-5">
                <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="28" 
                    height="28" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Entrar como Facilitador</h2>
                  <p className="text-sm text-muted-foreground mt-1">Acesso para Facilitadores do PG Repense</p>
                </div>
                <div className="text-muted-foreground group-hover:text-primary transition-colors">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            </Card>
          </Link>

          {/* Admin/Pastor Option */}
          <Link href="/admin/login" className="block group">
            <Card 
              hoverable 
              className="relative overflow-hidden border-2 transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-md"
              padding="lg"
            >
              <div className="flex items-center space-x-5">
                <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="28" 
                    height="28" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M12 8v4"/>
                    <path d="M12 16h.01"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Entrar como Administrador</h2>
                  <p className="text-sm text-muted-foreground mt-1">Acesso para Administradores e Pastores</p>
                </div>
                <div className="text-muted-foreground group-hover:text-primary transition-colors">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Back Link */}
        <div className="pt-6 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <svg 
              className="mr-2 w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para o início
          </Link>
        </div>

        {/* Copyright */}
        <p className="mt-8 text-center text-xs text-gray-400">
          © Igreja Red 2026. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
