-- Chạy SAU KHI người dùng đã đăng nhập ít nhất một lần hoặc đã được tạo
-- trong Authentication > Users.
--
-- THAY email bên dưới trước khi Run.
-- Quyền được ghi vào raw_app_meta_data (an toàn cho authorization);
-- không dùng raw_user_meta_data vì người dùng có thể tự sửa metadata đó.

do $$
declare
  target_email constant text := 'THAY_EMAIL_ADMIN_CUA_BAN@example.com';
  affected_rows integer;
begin
  if target_email = 'THAY_EMAIL_ADMIN_CUA_BAN@example.com' then
    raise exception 'Hãy thay target_email trong file 03_make_admin.sql trước khi chạy.';
  end if;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
  where lower(email) = lower(target_email);

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'Không tìm thấy user có email: %', target_email;
  end if;

  raise notice 'Đã cấp quyền admin cho %', target_email;
end
$$;

-- Kết quả mong đợi: role = admin.
select
  id,
  email,
  raw_app_meta_data ->> 'role' as role,
  created_at
from auth.users
where raw_app_meta_data ->> 'role' = 'admin'
order by created_at;
