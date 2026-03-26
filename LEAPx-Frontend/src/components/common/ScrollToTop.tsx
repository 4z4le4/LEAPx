import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type Props = {
  /**
   * ✅ ถ้า true จะ scroll top เมื่อ querystring เปลี่ยนด้วย
   * (เช่น /activities?majorCategoryId=5)
   */
  includeSearch?: boolean;

  /**
   * ✅ เลือก behavior ของการเลื่อน
   * - "auto" = กระโดดขึ้นทันที (แนะนำเวลาเปลี่ยนหน้า)
   * - "smooth" = เลื่อนนุ่ม
   */
  behavior?: ScrollBehavior;
};

export default function ScrollToTop({
  includeSearch = true,
  behavior = "auto",
}: Props) {
  const { pathname, search } = useLocation();

  const effectiveSearch = includeSearch ? search : null;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior });
  }, [pathname, effectiveSearch, behavior]);

  return null;
}
