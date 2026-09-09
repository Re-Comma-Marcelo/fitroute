import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

// Session lives in localStorage, so the gate runs client-side only.
export const Route = createFileRoute("/_authenticated")({
 ssr: false,
 beforeLoad: async () => {
 const { data, error } = await supabase.auth.getUser();
 if (error || !data.user) throw redirect({ to: "/" });
 return { user: data.user };
 },
 component: () => <Outlet />,
});
