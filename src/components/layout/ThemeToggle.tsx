// [신설: 2026-09-02 14:10, 김병현 작성] 라이트/다크 전환 버튼.
// 옛 Layout.tsx 안에 있던 걸 그대로 옮겼다 — 로직·aria-label·title 문구 전부 무변경,
// 마크업만 이모지 버튼 → shadcn Button + lucide 아이콘으로 바뀌었다.
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../ui/button';

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const dark = mode === 'dark';
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={dark ? '라이트 모드' : '다크 모드'}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
