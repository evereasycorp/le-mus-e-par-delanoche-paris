
-- BRANDS : admin voit et gère tout
CREATE POLICY "Admin voit toutes les marques" ON public.brands FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gère toutes les marques" ON public.brands FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- GUESTBOOK : admin voit tout (y compris masqué) et supprime
CREATE POLICY "Admin voit toutes les entrées" ON public.guestbook_entries FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin supprime toute entrée" ON public.guestbook_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- PROFILES : admin met à jour (suspension)
CREATE POLICY "Admin met à jour les profils" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- USER_ROLES : admin lit tous les rôles
CREATE POLICY "Admin lit tous les rôles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- BADGES : admin gère
CREATE POLICY "Admin gère les badges" ON public.badges FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- BRAND_BADGES : admin attribue/retire
CREATE POLICY "Admin gère les attributions" ON public.brand_badges FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
