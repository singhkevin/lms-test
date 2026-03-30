import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function StaffLogin() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await login(data, "staff");
    } catch {
      // error handled in auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border/50 rounded-3xl p-8 shadow-2xl shadow-black/5"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-slate-600 dark:text-slate-300" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Staff Portal</h1>
            <p className="text-muted-foreground text-sm">
              Restricted to owners and instructors
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl bg-muted/50"
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-12 rounded-xl bg-muted/50"
                {...register("password")}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              variant="outline"
              className="w-full h-12 rounded-xl text-base border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to Staff Portal"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8 pt-4 border-t border-border/40">
            Looking for the student portal?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Student Login →
            </Link>
          </p>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link href="/" className="hover:underline">← Back to LMS Academy</Link>
        </p>
      </div>
    </div>
  );
}
