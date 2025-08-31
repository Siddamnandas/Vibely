export const dynamic = "force-dynamic";
import AuthSuccessClient from "./success-client";

export default function AuthSuccessPage({ searchParams }: any) {
  const provider = searchParams?.provider as string | undefined;
  const code = searchParams?.code as string | undefined;
  return <AuthSuccessClient provider={provider || null} code={code || null} />;
}
