import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "instructor"]),
});

type FormData = z.infer<typeof formSchema>;

export default function Register() {
  const { register: authRegister } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { role: "student" }
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await authRegister(data);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-card border border-border/50 rounded-3xl p-8 shadow-2xl shadow-black/5"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Create Account</h1>
            <p className="text-muted-foreground">Join LMS Academy to start learning or teaching.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>I want to...</Label>
              <RadioGroup 
                defaultValue="student" 
                onValueChange={(v) => setValue("role", v as any)}
                className="flex gap-4"
              >
                <div className={`flex items-center space-x-2 border p-3 rounded-xl flex-1 cursor-pointer transition-colors ${selectedRole === 'student' ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/50'}`} onClick={() => setValue("role", "student")}>
                  <RadioGroupItem value="student" id="r1" />
                  <Label htmlFor="r1" className="cursor-pointer font-medium">Learn</Label>
                </div>
                <div className={`flex items-center space-x-2 border p-3 rounded-xl flex-1 cursor-pointer transition-colors ${selectedRole === 'instructor' ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/50'}`} onClick={() => setValue("role", "instructor")}>
                  <RadioGroupItem value="instructor" id="r2" />
                  <Label htmlFor="r2" className="cursor-pointer font-medium">Teach</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                className="h-12 rounded-xl bg-muted/50"
                {...register("name")} 
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                className="h-12 rounded-xl bg-muted/50"
                {...register("email")} 
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="h-12 rounded-xl bg-muted/50"
                {...register("password")} 
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/20 mt-2" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </MainLayout>
  );
}
