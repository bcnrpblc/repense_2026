'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardHeader } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';

type AdminUser = {
  id: string;
  email: string;
  role: string;
  criado_em: string;
  type: 'admin';
};

type TeacherUser = {
  id: string;
  nome: string;
  email: string;
  eh_ativo: boolean;
  criado_em: string;
  type: 'teacher';
};

type UserRow = AdminUser | TeacherUser;

export default function SuperadminPasswordsPage() {
  const { token } = useAuth({ requiredRole: 'admin' });
  const [users, setUsers] = useState<UserRow[]>(null as unknown as UserRow[]);
  const [filteredUsers, setFilteredUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [generatedFor, setGeneratedFor] = useState<UserRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/superadmin/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error('Falha ao carregar lista de usuários');
        }
        const data = await res.json();
        const allUsers: UserRow[] = [
          ...(data.admins ?? []),
          ...(data.teachers ?? []),
        ];
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      } catch (err) {
        console.error('Error fetching superadmin users:', err);
        setError('Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [token]);

  useEffect(() => {
    if (!users) return;
    const term = search.toLowerCase().trim();
    if (!term) {
      setFilteredUsers(users);
      return;
    }
    setFilteredUsers(
      users.filter((u) => {
        const name = 'nome' in u ? u.nome : '';
        return (
          u.email.toLowerCase().includes(term) ||
          name.toLowerCase().includes(term)
        );
      })
    );
  }, [search, users]);

  async function handleResetPassword(user: UserRow) {
    if (!token) return;
    setResettingId(user.id);
    setGeneratedPassword(null);
    setGeneratedFor(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/superadmin/users/${user.id}/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao redefinir senha');
      }

      const data = await res.json();
      setGeneratedPassword(data.newPassword);
      setGeneratedFor(user);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(
        err instanceof Error ? err.message : 'Erro ao redefinir senha'
      );
    } finally {
      setResettingId(null);
    }
  }

  function copyPassword() {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword).catch(() => {
      // ignore copy errors
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Senhas</h1>
        <p className="text-sm text-muted-foreground">
          Redefina senhas de administradores e facilitadores. A nova senha será exibida apenas uma vez.
        </p>
      </div>

      <Card
        header={
          <CardHeader
            title="Usuários"
            subtitle="Admins e facilitadores cadastrados no sistema"
          />
        }
      >
        <div className="space-y-4">
          <Input
            label="Buscar usuário"
            placeholder="Buscar por nome ou email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading && (
            <p className="text-sm text-muted-foreground">Carregando usuários...</p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && filteredUsers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum usuário encontrado.
            </p>
          )}

          {!loading && filteredUsers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                      Tipo
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                      Nome / Email
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2">
                        {user.type === 'admin' ? 'Admin' : 'Facilitador'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          {'nome' in user && (
                            <span className="font-medium text-gray-900">
                              {user.nome}
                            </span>
                          )}
                          <span className="text-xs text-gray-600">
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {user.type === 'teacher' ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              user.eh_ativo
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {user.eh_ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                            {user.role === 'superadmin'
                              ? 'Superadmin'
                              : 'Admin'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={resettingId === user.id}
                          onClick={() => handleResetPassword(user)}
                        >
                          Redefinir Senha
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {generatedPassword && generatedFor && (
        <Card
          header={
            <CardHeader
              title="Nova Senha Gerada"
              subtitle="Copie e compartilhe com o usuário. Ela não será exibida novamente."
            />
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Usuário:{' '}
              {'nome' in generatedFor
                ? generatedFor.nome
                : generatedFor.email}{' '}
              ({generatedFor.type === 'admin' ? 'Admin' : 'Facilitador'})
            </p>
            <div className="flex items-center gap-2">
              <code className="px-3 py-2 bg-muted rounded text-sm break-all">
                {generatedPassword}
              </code>
              <Button
                size="sm"
                variant="secondary"
                onClick={copyPassword}
              >
                Copiar
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

