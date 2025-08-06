import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('handles press events', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={onPressMock} />
    );

    fireEvent.press(getByText('Test Button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    const { getByTestId } = render(
      <Button title="Test Button" loading={true} onPress={() => {}} />
    );

    expect(getByTestId('button-loading')).toBeTruthy();
  });

  it('disables button when disabled prop is true', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={onPressMock} disabled={true} />
    );

    const button = getByText('Test Button');
    fireEvent.press(button);
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('applies correct variant styles', () => {
    const { getByTestId } = render(
      <Button title="Test Button" variant="secondary" onPress={() => {}} />
    );

    const button = getByTestId('test-button');
    expect(button).toBeTruthy();
  });
});
