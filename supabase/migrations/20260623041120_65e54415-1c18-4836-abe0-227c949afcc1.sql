REVOKE EXECUTE ON FUNCTION public.recompute_brand_scores() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_brand_scores() TO service_role;