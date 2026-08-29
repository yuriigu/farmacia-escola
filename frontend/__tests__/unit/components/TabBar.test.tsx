import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabBar } from '@/components/shared/TabBar';
import { Pill, AlertCircle } from 'lucide-react';

describe('TabBar Component', () => {
  const tabs = [
    { id: 'tab1', label: 'Medicamentos', icon: Pill },
    { id: 'tab2', label: 'Alertas', icon: AlertCircle },
  ];

  it('deve renderizar as abas', () => {
    const { getByText } = render(<TabBar tabs={tabs} activeTab="tab1" onTabChange={() => {}} />);

    expect(getByText('Medicamentos')).toBeInTheDocument();
    expect(getByText('Alertas')).toBeInTheDocument();
  });

  it('deve chamar onTabChange ao clicar em uma aba', async () => {
    const user = userEvent.setup();
    const handleTabChange = vi.fn();
    const { getByText } = render(<TabBar tabs={tabs} activeTab="tab1" onTabChange={handleTabChange} />);

    await user.click(getByText('Alertas'));

    expect(handleTabChange).toHaveBeenCalledWith('tab2');
  });

  it('não deve renderizar nada se houver 1 ou menos abas', () => {
    const { container } = render(
      <TabBar tabs={[{ id: 'tab1', label: 'Única', icon: Pill }]} activeTab="tab1" onTabChange={() => {}} />
    );

    expect(container.firstChild).toBeNull();
  });
});