export const dynamic = "force-dynamic";
import AuthSuccessClient from "./success-client";

export default async function AuthSuccessPage({ searchParams }: any) {
  const params = await searchParams;
  const provider = params?.provider as string | undefined;
  const code = params?.code as string | undefined;
  return <AuthSuccessClient provider={provider || null} code={code || null} />;
}
