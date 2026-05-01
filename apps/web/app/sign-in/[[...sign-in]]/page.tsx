import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-stone-50">
      <SignIn />
    </main>
  );
}
