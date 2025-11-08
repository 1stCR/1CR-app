-- ============================================================================
-- APPLIANCE MANAGER - ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- This script enables RLS and creates policies for authenticated users
-- Run this in Supabase SQL Editor after creating the tables
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_cross_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_xref_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_ai_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_compilation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialty_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE POLICIES FOR AUTHENTICATED USERS (Full Access)
-- ============================================================================
-- For this single-user application, authenticated users get full access
-- In a multi-tenant app, you would add user_id checks here
-- ============================================================================

-- CUSTOMERS
CREATE POLICY "Authenticated users can view customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update customers" ON customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete customers" ON customers FOR DELETE TO authenticated USING (true);

-- CONTACTS
CREATE POLICY "Authenticated users can view contacts" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contacts" ON contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contacts" ON contacts FOR DELETE TO authenticated USING (true);

-- JOBS
CREATE POLICY "Authenticated users can view jobs" ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update jobs" ON jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete jobs" ON jobs FOR DELETE TO authenticated USING (true);

-- JOB_VISITS
CREATE POLICY "Authenticated users can view job_visits" ON job_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert job_visits" ON job_visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update job_visits" ON job_visits FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete job_visits" ON job_visits FOR DELETE TO authenticated USING (true);

-- TOUR_LOG
CREATE POLICY "Authenticated users can view tour_log" ON tour_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tour_log" ON tour_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tour_log" ON tour_log FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tour_log" ON tour_log FOR DELETE TO authenticated USING (true);

-- TOUR_SUMMARY
CREATE POLICY "Authenticated users can view tour_summary" ON tour_summary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tour_summary" ON tour_summary FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tour_summary" ON tour_summary FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tour_summary" ON tour_summary FOR DELETE TO authenticated USING (true);

-- PARTS_MASTER
CREATE POLICY "Authenticated users can view parts_master" ON parts_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert parts_master" ON parts_master FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update parts_master" ON parts_master FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete parts_master" ON parts_master FOR DELETE TO authenticated USING (true);

-- PARTS_TRANSACTIONS
CREATE POLICY "Authenticated users can view parts_transactions" ON parts_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert parts_transactions" ON parts_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update parts_transactions" ON parts_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete parts_transactions" ON parts_transactions FOR DELETE TO authenticated USING (true);

-- PARTS_ORDERS
CREATE POLICY "Authenticated users can view parts_orders" ON parts_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert parts_orders" ON parts_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update parts_orders" ON parts_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete parts_orders" ON parts_orders FOR DELETE TO authenticated USING (true);

-- PARTS_ORDER_ITEMS
CREATE POLICY "Authenticated users can view parts_order_items" ON parts_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert parts_order_items" ON parts_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update parts_order_items" ON parts_order_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete parts_order_items" ON parts_order_items FOR DELETE TO authenticated USING (true);

-- PARTS_CROSS_REFERENCE
CREATE POLICY "Authenticated users can view parts_cross_reference" ON parts_cross_reference FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert parts_cross_reference" ON parts_cross_reference FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update parts_cross_reference" ON parts_cross_reference FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete parts_cross_reference" ON parts_cross_reference FOR DELETE TO authenticated USING (true);

-- PARTS_XREF_GROUPS
CREATE POLICY "Authenticated users can view parts_xref_groups" ON parts_xref_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert parts_xref_groups" ON parts_xref_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update parts_xref_groups" ON parts_xref_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete parts_xref_groups" ON parts_xref_groups FOR DELETE TO authenticated USING (true);

-- PARTS_AI_DATA
CREATE POLICY "Authenticated users can view parts_ai_data" ON parts_ai_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert parts_ai_data" ON parts_ai_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update parts_ai_data" ON parts_ai_data FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete parts_ai_data" ON parts_ai_data FOR DELETE TO authenticated USING (true);

-- SHIPMENTS
CREATE POLICY "Authenticated users can view shipments" ON shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert shipments" ON shipments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update shipments" ON shipments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete shipments" ON shipments FOR DELETE TO authenticated USING (true);

-- MODEL_DATABASE
CREATE POLICY "Authenticated users can view model_database" ON model_database FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert model_database" ON model_database FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update model_database" ON model_database FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete model_database" ON model_database FOR DELETE TO authenticated USING (true);

-- MODEL_COMPILATION_ITEMS
CREATE POLICY "Authenticated users can view model_compilation_items" ON model_compilation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert model_compilation_items" ON model_compilation_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update model_compilation_items" ON model_compilation_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete model_compilation_items" ON model_compilation_items FOR DELETE TO authenticated USING (true);

-- COMMON_ISSUES
CREATE POLICY "Authenticated users can view common_issues" ON common_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert common_issues" ON common_issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update common_issues" ON common_issues FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete common_issues" ON common_issues FOR DELETE TO authenticated USING (true);

-- LABOR_ADJUSTMENTS
CREATE POLICY "Authenticated users can view labor_adjustments" ON labor_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert labor_adjustments" ON labor_adjustments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update labor_adjustments" ON labor_adjustments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete labor_adjustments" ON labor_adjustments FOR DELETE TO authenticated USING (true);

-- SPECIALTY_TOOLS
CREATE POLICY "Authenticated users can view specialty_tools" ON specialty_tools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert specialty_tools" ON specialty_tools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update specialty_tools" ON specialty_tools FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete specialty_tools" ON specialty_tools FOR DELETE TO authenticated USING (true);

-- STORAGE_LOCATIONS
CREATE POLICY "Authenticated users can view storage_locations" ON storage_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert storage_locations" ON storage_locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update storage_locations" ON storage_locations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete storage_locations" ON storage_locations FOR DELETE TO authenticated USING (true);

-- SUPPLIERS
CREATE POLICY "Authenticated users can view suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update suppliers" ON suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete suppliers" ON suppliers FOR DELETE TO authenticated USING (true);

-- JOB_HISTORY
CREATE POLICY "Authenticated users can view job_history" ON job_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert job_history" ON job_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update job_history" ON job_history FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete job_history" ON job_history FOR DELETE TO authenticated USING (true);

-- CALLBACKS
CREATE POLICY "Authenticated users can view callbacks" ON callbacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert callbacks" ON callbacks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update callbacks" ON callbacks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete callbacks" ON callbacks FOR DELETE TO authenticated USING (true);

-- TAGS
CREATE POLICY "Authenticated users can view tags" ON tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tags" ON tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tags" ON tags FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tags" ON tags FOR DELETE TO authenticated USING (true);

-- SETTINGS
CREATE POLICY "Authenticated users can view settings" ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settings" ON settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update settings" ON settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete settings" ON settings FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify all policies were created

SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- DONE! Your RLS policies are now configured.
-- ============================================================================
