import React, { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Updates from 'expo-updates';
import i18n from 'i18next';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console in dev, Sentry in production
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // Fallback: reset state so app re-renders
      this.setState({ hasError: false, error: null });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#0F172A',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            {i18n.t('errors.something_went_wrong', { defaultValue: 'Something went wrong' })}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#64748B',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20,
            }}
          >
            {i18n.t('errors.unexpected_error', { defaultValue: 'The app encountered an unexpected error. Please try reloading.' })}
          </Text>
          {__DEV__ && this.state.error ? (
            <Text
              style={{
                fontSize: 12,
                color: '#EF4444',
                textAlign: 'center',
                marginBottom: 24,
                fontFamily: 'monospace',
              }}
              numberOfLines={5}
            >
              {this.state.error.message}
            </Text>
          ) : null}
          <Pressable
            onPress={this.handleReload}
            style={{
              backgroundColor: '#1E293B',
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {i18n.t('errors.reload', { defaultValue: 'Reload' })}
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
