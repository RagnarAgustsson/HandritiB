CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chunks_session_id_idx" ON "chunks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "notes_session_id_idx" ON "notes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "usage_user_period_idx" ON "usage_records" USING btree ("user_id","period_start");