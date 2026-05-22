import { expect, test } from '@playwright/test';

test('이슈 제출 성공 메시지를 표시한다', async ({ page }) => {
  await page.route('**/tasks', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ accepted: true }),
    });
  });

  await page.goto('/');
  await page
    .getByPlaceholder('구현할 이슈를 입력하세요… (Ctrl+Enter로 제출)')
    .fill('E2E smoke test');
  await page.getByRole('button', { name: '실행' }).click();

  await expect(page.getByText('이슈가 전달됐습니다. 에이전트가 작업을 시작합니다.')).toBeVisible();
});

test('이슈 제출 실패 시 에러 메시지를 표시한다', async ({ page }) => {
  await page.route('**/tasks', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'text/plain',
      body: 'internal error',
    });
  });

  await page.goto('/');
  await page
    .getByPlaceholder('구현할 이슈를 입력하세요… (Ctrl+Enter로 제출)')
    .fill('failing issue');
  await page.getByRole('button', { name: '실행' }).click();

  await expect(page.getByText(/서버 오류 500/)).toBeVisible();
});

test('API 연결 실패 시 연결 에러 배너를 표시한다', async ({ page }) => {
  await page.goto('/?e2e_socket_error=1');
  await expect(page.getByText(/서버 연결 실패:/)).toBeVisible();
});

test('에이전트 선택 후 터미널 탭 토글이 동작한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Backend/ }).click();
  await page.getByRole('button', { name: '터미널' }).click();
  await expect(page.getByText('backend · pty')).toBeVisible();
  await expect(page.getByText('대기 중… 에이전트가 실행되면 출력이 표시됩니다.')).toBeVisible();

  await page.getByRole('button', { name: '이벤트' }).click();
  await expect(page.getByText('Backend 로그')).toBeVisible();
  await expect(page.locator('.vo-log-entry').first()).toBeVisible();
});
