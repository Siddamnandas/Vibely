export const dynamic = "force-dynamic";
import SpotifyCallbackClient from "./callback-client";

export default function SpotifyCallback({ searchParams }: any) {
  const code = searchParams?.code as string | undefined;
  const error = searchParams?.error as string | undefined;
  return <SpotifyCallbackClient code={code || null} error={error || null} />;
}
