-- Local dev test account (123456@gmail.com) + recent test data for local D1.
-- Applied via: wrangler d1 execute fitness-db --config server/wrangler.jsonc --local --file=server/test-data.sql
-- Idempotent: re-applying deletes the test user (cascading their old data via FK)
-- and any 'test-' prefixed rows first, then re-inserts. Never touches seed
-- library rows or any other user's data.
-- Four time blocks so the 30d / 90d / 1Y / All tabs all render differently:
-- recent (Oct 2026, fresh fatigue), mid (late Aug - early Sep, 90d+ only),
-- old (May - Jun 2026, 1Y/All only), 2025 (Sep 2025, All only).

-- Test user: every row below links to this user_id.
DELETE FROM users WHERE id = '5cc2972e-cb11-42e1-9e3b-2702ff34b957';
INSERT INTO users (id, email, password_hash, created_at, gender, name, bodyweight, bodyweight_unit, target_weight, effort_scale, timer_sound, timer_sound_on, timer_vibrate, timer_flash, language) VALUES ('5cc2972e-cb11-42e1-9e3b-2702ff34b957', '123456@gmail.com', 'pbkdf2:100000:TNXG6MTYESkJwgHf4idn/Q==:8d27aA8HVRZCJ2PKTAjZvLso+0bA5GROEntfuftaWKE=', '2026-10-16T01:06:34.434Z', 'female', 'Charlotte', NULL, 'kg', 68, 'rir', 'beep', 1, 1, 0, 'en');

DELETE FROM workout_session_sets WHERE session_id LIKE 'test-session-%';
DELETE FROM workout_sessions WHERE id LIKE 'test-session-%';
DELETE FROM workout_list_exercises WHERE list_id LIKE 'test-list-%';
DELETE FROM workout_lists WHERE id LIKE 'test-list-%';
DELETE FROM bodyweight_log WHERE id LIKE 'test-weighin-%';

INSERT INTO workout_lists (id, name, user_id, created_at, deleted_at) VALUES ('test-list-push', 'Test Push', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', '2026-10-01T08:00:00Z', NULL);
INSERT INTO workout_lists (id, name, user_id, created_at, deleted_at) VALUES ('test-list-pull', 'Test Pull', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', '2026-10-01T08:00:00Z', NULL);
INSERT INTO workout_lists (id, name, user_id, created_at, deleted_at) VALUES ('test-list-legs', 'Test Legs', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', '2026-10-01T08:00:00Z', NULL);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-push', '0025', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-push', '0047', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-push', '0030', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-push', '0251', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-push', '0091', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-pull', '0652', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-pull', '0027', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-pull', '0031', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-legs', '0043', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-legs', '0032', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-legs', '0085', '2026-10-01T08:00:00Z', 60, 1, 1);
INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled) VALUES ('test-list-legs', '0648', '2026-10-01T08:00:00Z', 60, 1, 1);

INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-01', 'test-list-legs', 'Test Legs', '2026-10-03T08:30:00Z', '2026-10-03T09:40:00Z', 70.3, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0001', 'test-session-01', '0043', 1, 6, 100, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0002', 'test-session-01', '0043', 2, 6, 100, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0003', 'test-session-01', '0043', 3, 6, 100, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0004', 'test-session-01', '0043', 4, 6, 100, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0005', 'test-session-01', '0032', 1, 5, 118, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0006', 'test-session-01', '0032', 2, 5, 118, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0007', 'test-session-01', '0032', 3, 5, 118, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0008', 'test-session-01', '0085', 1, 10, 72, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0009', 'test-session-01', '0085', 2, 10, 72, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0010', 'test-session-01', '0085', 3, 10, 72, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0011', 'test-session-01', '0648', 1, 5, 45, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0012', 'test-session-01', '0648', 2, 5, 45, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0013', 'test-session-01', '0648', 3, 5, 45, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-02', 'test-list-push', 'Test Push', '2026-10-05T08:30:00Z', '2026-10-05T09:40:00Z', 70.1, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0014', 'test-session-02', '0025', 1, 8, 72, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0015', 'test-session-02', '0025', 2, 8, 72, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0016', 'test-session-02', '0025', 3, 8, 72, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0017', 'test-session-02', '0025', 4, 8, 72, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0018', 'test-session-02', '0047', 1, 8, 54, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0019', 'test-session-02', '0047', 2, 8, 54, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0020', 'test-session-02', '0047', 3, 8, 54, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0021', 'test-session-02', '0047', 4, 8, 54, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0022', 'test-session-02', '0030', 1, 10, 50, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0023', 'test-session-02', '0030', 2, 10, 50, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0024', 'test-session-02', '0030', 3, 10, 50, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0025', 'test-session-02', '0251', 1, 10, 9, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0026', 'test-session-02', '0251', 2, 10, 9, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0027', 'test-session-02', '0251', 3, 10, 9, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0028', 'test-session-02', '0091', 1, 8, 36, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0029', 'test-session-02', '0091', 2, 8, 36, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0030', 'test-session-02', '0091', 3, 8, 36, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-03', 'test-list-pull', 'Test Pull', '2026-10-08T08:30:00Z', '2026-10-08T09:40:00Z', 69.9, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0031', 'test-session-03', '0652', 1, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0032', 'test-session-03', '0652', 2, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0033', 'test-session-03', '0652', 3, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0034', 'test-session-03', '0652', 4, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0035', 'test-session-03', '0027', 1, 8, 63, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0036', 'test-session-03', '0027', 2, 8, 63, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0037', 'test-session-03', '0027', 3, 8, 63, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0038', 'test-session-03', '0027', 4, 8, 63, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0039', 'test-session-03', '0031', 1, 10, 31, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0040', 'test-session-03', '0031', 2, 10, 31, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0041', 'test-session-03', '0031', 3, 10, 31, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-04', 'test-list-legs', 'Test Legs', '2026-10-10T08:30:00Z', '2026-10-10T09:40:00Z', 69.7, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0042', 'test-session-04', '0043', 1, 6, 107.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0043', 'test-session-04', '0043', 2, 6, 107.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0044', 'test-session-04', '0043', 3, 6, 107.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0045', 'test-session-04', '0043', 4, 6, 107.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0046', 'test-session-04', '0032', 1, 5, 126, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0047', 'test-session-04', '0032', 2, 5, 126, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0048', 'test-session-04', '0032', 3, 5, 126, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0049', 'test-session-04', '0085', 1, 10, 77, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0050', 'test-session-04', '0085', 2, 10, 77, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0051', 'test-session-04', '0085', 3, 10, 77, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0052', 'test-session-04', '0648', 1, 5, 48.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0053', 'test-session-04', '0648', 2, 5, 48.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0054', 'test-session-04', '0648', 3, 5, 48.5, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-05', 'test-list-push', 'Test Push', '2026-10-12T08:30:00Z', '2026-10-12T09:40:00Z', 69.6, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0055', 'test-session-05', '0025', 1, 8, 77, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0056', 'test-session-05', '0025', 2, 8, 77, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0057', 'test-session-05', '0025', 3, 8, 77, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0058', 'test-session-05', '0025', 4, 8, 77, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0059', 'test-session-05', '0047', 1, 8, 58, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0060', 'test-session-05', '0047', 2, 8, 58, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0061', 'test-session-05', '0047', 3, 8, 58, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0062', 'test-session-05', '0047', 4, 8, 58, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0063', 'test-session-05', '0030', 1, 10, 53.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0064', 'test-session-05', '0030', 2, 10, 53.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0065', 'test-session-05', '0030', 3, 10, 53.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0066', 'test-session-05', '0251', 1, 10, 10, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0067', 'test-session-05', '0251', 2, 10, 10, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0068', 'test-session-05', '0251', 3, 10, 10, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0069', 'test-session-05', '0091', 1, 8, 39, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0070', 'test-session-05', '0091', 2, 8, 39, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0071', 'test-session-05', '0091', 3, 8, 39, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-06', 'test-list-pull', 'Test Pull', '2026-10-14T08:30:00Z', '2026-10-14T09:40:00Z', 69.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0072', 'test-session-06', '0652', 1, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0073', 'test-session-06', '0652', 2, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0074', 'test-session-06', '0652', 3, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0075', 'test-session-06', '0652', 4, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0076', 'test-session-06', '0027', 1, 8, 68, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0077', 'test-session-06', '0027', 2, 8, 68, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0078', 'test-session-06', '0027', 3, 8, 68, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0079', 'test-session-06', '0027', 4, 8, 68, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0080', 'test-session-06', '0031', 1, 10, 34, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0081', 'test-session-06', '0031', 2, 10, 34, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0082', 'test-session-06', '0031', 3, 10, 34, 'kg');

INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-01', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 70.5, 'kg', '2026-10-01T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-02', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 70.2, 'kg', '2026-10-04T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-03', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 70.0, 'kg', '2026-10-07T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-04', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 69.7, 'kg', '2026-10-10T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-05', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 69.5, 'kg', '2026-10-14T07:00:00Z');
-- Effort spread across RIR presets so the Effort card has an average,
-- a week-by-week line, and a populated distribution.
UPDATE workout_session_sets SET rir = CASE (CAST(SUBSTR(id, 10) AS INTEGER) % 6)
  WHEN 0 THEN 0
  WHEN 1 THEN 0.5
  WHEN 2 THEN 1
  WHEN 3 THEN 2
  WHEN 4 THEN 3
  ELSE 4
END WHERE session_id IN ('test-session-01', 'test-session-02', 'test-session-03', 'test-session-04', 'test-session-05', 'test-session-06');

INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-07', 'test-list-legs', 'Test Legs', '2026-08-22T08:30:00Z', '2026-08-22T09:40:00Z', 72, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0083', 'test-session-07', '0043', 1, 6, 92, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0084', 'test-session-07', '0043', 2, 6, 92, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0085', 'test-session-07', '0043', 3, 6, 92, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0086', 'test-session-07', '0043', 4, 6, 92, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0087', 'test-session-07', '0032', 1, 5, 108, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0088', 'test-session-07', '0032', 2, 5, 108, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0089', 'test-session-07', '0032', 3, 5, 108, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0090', 'test-session-07', '0085', 1, 10, 66, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0091', 'test-session-07', '0085', 2, 10, 66, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0092', 'test-session-07', '0085', 3, 10, 66, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0093', 'test-session-07', '0648', 1, 5, 41, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0094', 'test-session-07', '0648', 2, 5, 41, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0095', 'test-session-07', '0648', 3, 5, 41, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-08', 'test-list-push', 'Test Push', '2026-08-25T08:30:00Z', '2026-08-25T09:40:00Z', 71.9, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0096', 'test-session-08', '0025', 1, 8, 67, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0097', 'test-session-08', '0025', 2, 8, 67, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0098', 'test-session-08', '0025', 3, 8, 67, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0099', 'test-session-08', '0025', 4, 8, 67, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0100', 'test-session-08', '0047', 1, 8, 50, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0101', 'test-session-08', '0047', 2, 8, 50, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0102', 'test-session-08', '0047', 3, 8, 50, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0103', 'test-session-08', '0047', 4, 8, 50, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0104', 'test-session-08', '0030', 1, 10, 46, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0105', 'test-session-08', '0030', 2, 10, 46, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0106', 'test-session-08', '0030', 3, 10, 46, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0107', 'test-session-08', '0251', 1, 10, 8.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0108', 'test-session-08', '0251', 2, 10, 8.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0109', 'test-session-08', '0251', 3, 10, 8.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0110', 'test-session-08', '0091', 1, 8, 33, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0111', 'test-session-08', '0091', 2, 8, 33, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0112', 'test-session-08', '0091', 3, 8, 33, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-09', 'test-list-pull', 'Test Pull', '2026-08-30T08:30:00Z', '2026-08-30T09:40:00Z', 71.7, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0113', 'test-session-09', '0652', 1, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0114', 'test-session-09', '0652', 2, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0115', 'test-session-09', '0652', 3, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0116', 'test-session-09', '0652', 4, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0117', 'test-session-09', '0027', 1, 8, 58, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0118', 'test-session-09', '0027', 2, 8, 58, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0119', 'test-session-09', '0027', 3, 8, 58, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0120', 'test-session-09', '0027', 4, 8, 58, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0121', 'test-session-09', '0031', 1, 10, 28.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0122', 'test-session-09', '0031', 2, 10, 28.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0123', 'test-session-09', '0031', 3, 10, 28.5, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-10', 'test-list-legs', 'Test Legs', '2026-09-09T08:30:00Z', '2026-09-09T09:40:00Z', 71.4, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0124', 'test-session-10', '0043', 1, 6, 96, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0125', 'test-session-10', '0043', 2, 6, 96, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0126', 'test-session-10', '0043', 3, 6, 96, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0127', 'test-session-10', '0043', 4, 6, 96, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0128', 'test-session-10', '0032', 1, 5, 113, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0129', 'test-session-10', '0032', 2, 5, 113, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0130', 'test-session-10', '0032', 3, 5, 113, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0131', 'test-session-10', '0085', 1, 10, 69, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0132', 'test-session-10', '0085', 2, 10, 69, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0133', 'test-session-10', '0085', 3, 10, 69, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0134', 'test-session-10', '0648', 1, 5, 43.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0135', 'test-session-10', '0648', 2, 5, 43.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0136', 'test-session-10', '0648', 3, 5, 43.5, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-11', 'test-list-push', 'Test Push', '2026-05-16T08:30:00Z', '2026-05-16T09:40:00Z', 73.2, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0137', 'test-session-11', '0025', 1, 8, 62, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0138', 'test-session-11', '0025', 2, 8, 62, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0139', 'test-session-11', '0025', 3, 8, 62, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0140', 'test-session-11', '0025', 4, 8, 62, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0141', 'test-session-11', '0047', 1, 8, 46, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0142', 'test-session-11', '0047', 2, 8, 46, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0143', 'test-session-11', '0047', 3, 8, 46, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0144', 'test-session-11', '0047', 4, 8, 46, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0145', 'test-session-11', '0030', 1, 10, 42, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0146', 'test-session-11', '0030', 2, 10, 42, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0147', 'test-session-11', '0030', 3, 10, 42, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0148', 'test-session-11', '0251', 1, 10, 8, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0149', 'test-session-11', '0251', 2, 10, 8, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0150', 'test-session-11', '0251', 3, 10, 8, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0151', 'test-session-11', '0091', 1, 8, 30, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0152', 'test-session-11', '0091', 2, 8, 30, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0153', 'test-session-11', '0091', 3, 8, 30, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-12', 'test-list-pull', 'Test Pull', '2026-06-06T08:30:00Z', '2026-06-06T09:40:00Z', 72.9, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0154', 'test-session-12', '0652', 1, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0155', 'test-session-12', '0652', 2, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0156', 'test-session-12', '0652', 3, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0157', 'test-session-12', '0652', 4, 8, 0, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0158', 'test-session-12', '0027', 1, 8, 54, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0159', 'test-session-12', '0027', 2, 8, 54, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0160', 'test-session-12', '0027', 3, 8, 54, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0161', 'test-session-12', '0027', 4, 8, 54, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0162', 'test-session-12', '0031', 1, 10, 26, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0163', 'test-session-12', '0031', 2, 10, 26, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0164', 'test-session-12', '0031', 3, 10, 26, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-13', 'test-list-legs', 'Test Legs', '2026-06-27T08:30:00Z', '2026-06-27T09:40:00Z', 72.6, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0165', 'test-session-13', '0043', 1, 6, 85, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0166', 'test-session-13', '0043', 2, 6, 85, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0167', 'test-session-13', '0043', 3, 6, 85, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0168', 'test-session-13', '0043', 4, 6, 85, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0169', 'test-session-13', '0032', 1, 5, 100, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0170', 'test-session-13', '0032', 2, 5, 100, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0171', 'test-session-13', '0032', 3, 5, 100, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0172', 'test-session-13', '0085', 1, 10, 60, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0173', 'test-session-13', '0085', 2, 10, 60, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0174', 'test-session-13', '0085', 3, 10, 60, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0175', 'test-session-13', '0648', 1, 5, 38, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0176', 'test-session-13', '0648', 2, 5, 38, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0177', 'test-session-13', '0648', 3, 5, 38, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-14', 'test-list-push', 'Test Push', '2025-09-06T08:30:00Z', '2025-09-06T09:40:00Z', 74.8, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0178', 'test-session-14', '0025', 1, 8, 56, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0179', 'test-session-14', '0025', 2, 8, 56, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0180', 'test-session-14', '0025', 3, 8, 56, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0181', 'test-session-14', '0025', 4, 8, 56, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0182', 'test-session-14', '0047', 1, 8, 42, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0183', 'test-session-14', '0047', 2, 8, 42, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0184', 'test-session-14', '0047', 3, 8, 42, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0185', 'test-session-14', '0047', 4, 8, 42, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0186', 'test-session-14', '0030', 1, 10, 38, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0187', 'test-session-14', '0030', 2, 10, 38, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0188', 'test-session-14', '0030', 3, 10, 38, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0189', 'test-session-14', '0251', 1, 10, 7.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0190', 'test-session-14', '0251', 2, 10, 7.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0191', 'test-session-14', '0251', 3, 10, 7.5, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0192', 'test-session-14', '0091', 1, 8, 27, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0193', 'test-session-14', '0091', 2, 8, 27, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0194', 'test-session-14', '0091', 3, 8, 27, 'kg');
INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES ('test-session-15', 'test-list-legs', 'Test Legs', '2025-09-20T08:30:00Z', '2025-09-20T09:40:00Z', 74.4, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0195', 'test-session-15', '0043', 1, 6, 78, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0196', 'test-session-15', '0043', 2, 6, 78, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0197', 'test-session-15', '0043', 3, 6, 78, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0198', 'test-session-15', '0043', 4, 6, 78, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0199', 'test-session-15', '0032', 1, 5, 92, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0200', 'test-session-15', '0032', 2, 5, 92, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0201', 'test-session-15', '0032', 3, 5, 92, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0202', 'test-session-15', '0085', 1, 10, 55, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0203', 'test-session-15', '0085', 2, 10, 55, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0204', 'test-session-15', '0085', 3, 10, 55, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0205', 'test-session-15', '0648', 1, 5, 35, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0206', 'test-session-15', '0648', 2, 5, 35, 'kg');
INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit) VALUES ('test-set-0207', 'test-session-15', '0648', 3, 5, 35, 'kg');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-06', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 72.2, 'kg', '2026-08-21T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-07', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 72, 'kg', '2026-08-28T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-08', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 71.6, 'kg', '2026-09-05T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-09', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 73.6, 'kg', '2026-05-15T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-10', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 73.2, 'kg', '2026-06-05T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-11', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 72.8, 'kg', '2026-06-26T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-12', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 75.2, 'kg', '2025-09-01T07:00:00Z');
INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES ('test-weighin-13', '5cc2972e-cb11-42e1-9e3b-2702ff34b957', 74.6, 'kg', '2025-09-19T07:00:00Z');
-- Mid block: easy bias (avg ~3.0) pulls the 90d average up.
UPDATE workout_session_sets SET rir = CASE (CAST(SUBSTR(id, 10) AS INTEGER) % 3)
  WHEN 0 THEN 2
  WHEN 1 THEN 3
  ELSE 4
END WHERE session_id IN ('test-session-07', 'test-session-08', 'test-session-09', 'test-session-10');
-- Old block: hard bias (avg ~0.5) pulls the 1Y average down.
UPDATE workout_session_sets SET rir = CASE (CAST(SUBSTR(id, 10) AS INTEGER) % 3)
  WHEN 0 THEN 0
  WHEN 1 THEN 0.5
  ELSE 1
END WHERE session_id IN ('test-session-11', 'test-session-12', 'test-session-13');
-- 2025 block (All tab only): easy bias (avg ~3.5).
UPDATE workout_session_sets SET rir = CASE (CAST(SUBSTR(id, 10) AS INTEGER) % 3)
  WHEN 0 THEN 3
  WHEN 1 THEN 3.5
  ELSE 4
END WHERE session_id IN ('test-session-14', 'test-session-15');
