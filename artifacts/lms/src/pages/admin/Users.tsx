import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListUsers } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search, Shield, User, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListUsers({ search, limit: 50 });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage learners and instructors across the platform.</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/50 flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or email..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl bg-muted/30 border-border/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading users...</td>
                  </tr>
                ) : data?.data?.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                          <AvatarImage src={user.avatarUrl || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        {user.role === 'owner' ? <Shield className="w-3.5 h-3.5 text-purple-500" /> : 
                         user.role === 'instructor' ? <GraduationCap className="w-3.5 h-3.5 text-orange-500" /> : 
                         <User className="w-3.5 h-3.5 text-blue-500" />}
                        <span className="capitalize">{user.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right text-primary font-medium hover:underline cursor-pointer">
                      View details
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
