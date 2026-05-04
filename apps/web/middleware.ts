import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes that require an authenticated session.
 * The assessment flow is anonymous-by-default — users sign up at lead capture.
 */
const isProtected = createRouteMatcher([
  "/me(.*)",
  "/sales(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    // protect() exists at runtime; Clerk v5.7 types may lag.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (auth as unknown as { protect: () => Promise<unknown> }).protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
