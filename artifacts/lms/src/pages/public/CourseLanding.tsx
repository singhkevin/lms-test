import { useParams, Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetCourse, useListSections } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Check, PlayCircle, Users, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface EnquiryForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;
  upscAttempts: string;
}

const defaultForm: EnquiryForm = {
  firstName: "", lastName: "", email: "", phone: "", age: "", upscAttempts: "",
};

export default function CourseLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { data: course, isLoading } = useGetCourse(slug);
  const { data: sections } = useListSections(slug);
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState<EnquiryForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  // Check if this student is enrolled
  const { data: enrollments } = useQuery({
    queryKey: ["enrollment-check", course?.id, user?.id],
    enabled: isAuthenticated && !!course?.id && user?.role === "student",
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/enrollments?courseId=${course!.id}&status=active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json() as Promise<{ data: { id: string }[] }>;
    },
  });

  const isEnrolled = (enrollments?.data?.length ?? 0) > 0;
  const coursePaymentLink = course?.paymentLink;
  const isPaid = course && course.price && Number(course.price) > 0;

  const handleCTAClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (isEnrolled) {
      navigate(`/my-learning/${course!.id}`);
      return;
    }
    if (isPaid && coursePaymentLink) {
      window.open(coursePaymentLink, "_blank", "noopener");
      return;
    }
    // Open enquiry form
    if (user?.email) {
      setEnquiryForm(f => ({ ...f, email: user.email ?? "" }));
    }
    setEnquiryOpen(true);
  };

  const handleSubmitEnquiry = async () => {
    const { firstName, lastName, email, phone, age, upscAttempts } = enquiryForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !age || !upscAttempts) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/courses/${course!.id}/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          age: Number(age),
          upscAttempts: Number(upscAttempts),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Enquiry submitted! Our team will reach out to you shortly.");
      setEnquiryOpen(false);
      setEnquiryForm(defaultForm);
    } catch {
      toast.error("Failed to submit enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const ctaLabel = () => {
    if (!isAuthenticated) return "Sign in to Enroll";
    if (isEnrolled) return "Go to Course";
    if (isPaid && coursePaymentLink) return "Enroll Now →";
    return "Request Enrolment";
  };

  if (isLoading) return <MainLayout><div className="h-screen animate-pulse bg-muted/30" /></MainLayout>;
  if (!course) return <MainLayout><div className="py-20 text-center">Course not found</div></MainLayout>;

  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-slate-900 text-white py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-20 blur-sm" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-900 to-indigo-900 opacity-50" />
          )}
        </div>
        <div className="container mx-auto px-4 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-balance">{course.title}</h1>
            <p className="text-lg text-white/80 mb-8 max-w-xl text-balance">{course.description}</p>
            <div className="flex items-center gap-6 text-sm text-white/70">
              <div className="flex items-center"><Users className="w-4 h-4 mr-2" /> {course.enrollmentCount} enrolled</div>
              <div className="flex items-center"><BookOpen className="w-4 h-4 mr-2" /> {sections?.length || 0} sections</div>
            </div>
          </div>
          <div className="lg:justify-self-end">
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 p-8 rounded-3xl text-white">
              <div className="text-center mb-8">
                <div className="text-4xl font-bold mb-2">
                  {isPaid ? `₹${Number(course.price).toLocaleString("en-IN")}` : "Free"}
                </div>
                {isEnrolled ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-medium">
                    <Check className="w-3.5 h-3.5" /> Already Enrolled
                  </div>
                ) : (
                  <p className="text-white/60 text-sm">
                    {isPaid ? "One-time payment" : "Full lifetime access"}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <Button
                  size="lg"
                  onClick={handleCTAClick}
                  className={`w-full rounded-xl h-14 text-lg shadow-xl ${
                    isEnrolled
                      ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                      : "bg-primary hover:bg-primary/90 shadow-primary/30"
                  } text-white`}
                >
                  {ctaLabel()}
                  {isEnrolled && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>

                {isPaid && !coursePaymentLink && !isEnrolled && (
                  <p className="text-xs text-white/50 text-center">
                    Submit an enquiry and our team will reach out to complete your enrolment.
                  </p>
                )}

                <div className="pt-6 space-y-3 text-sm">
                  <div className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span className="text-white/80">Self-paced learning</span></div>
                  <div className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span className="text-white/80">Access on mobile and desktop</span></div>
                  <div className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span className="text-white/80">Certificate of completion</span></div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <h2 className="text-3xl font-display font-bold mb-8">Course Curriculum</h2>
        <div className="space-y-4">
          {sections?.map((section, i) => (
            <div key={section.id} className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-sm">
              <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                <h3 className="font-semibold text-lg">Section {i+1}: {section.title}</h3>
              </div>
              <div className="divide-y divide-border/30">
                {section.lessons?.map(lesson => (
                  <div key={lesson.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/10">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="w-5 h-5 text-primary/60" />
                      <span className="font-medium text-sm">{lesson.title}</span>
                    </div>
                    {lesson.isFree && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full font-medium">Free Preview</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enquiry Dialog */}
      <Dialog open={enquiryOpen} onOpenChange={open => { if (!open) { setEnquiryOpen(false); setEnquiryForm(defaultForm); } }}>
        <DialogContent className="rounded-2xl sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enquire about {course.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input
                  value={enquiryForm.firstName}
                  onChange={e => setEnquiryForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="Arjun"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input
                  value={enquiryForm.lastName}
                  onChange={e => setEnquiryForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Sharma"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={enquiryForm.email}
                onChange={e => setEnquiryForm(f => ({ ...f, email: e.target.value }))}
                placeholder="arjun@example.com"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input
                type="tel"
                value={enquiryForm.phone}
                onChange={e => setEnquiryForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Age <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="10"
                  max="100"
                  value={enquiryForm.age}
                  onChange={e => setEnquiryForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="25"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>UPSC Attempts <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={enquiryForm.upscAttempts}
                  onChange={e => setEnquiryForm(f => ({ ...f, upscAttempts: e.target.value }))}
                  placeholder="0"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setEnquiryOpen(false)}>Cancel</Button>
              <Button className="rounded-xl" onClick={handleSubmitEnquiry} disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit Enquiry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
