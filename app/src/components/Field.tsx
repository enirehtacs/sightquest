import { useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, useTheme } from '@/theme';
import { MonoLabel } from './MonoLabel';
import { Txt } from './Txt';

type Props = TextInputProps & {
  label: string;
  /** Small grey line under the input. */
  hint?: string;
  /** Red line under the input; replaces the hint. */
  error?: string | null;
  /** Shown inside the box, before the text (e.g. "@"). */
  prefix?: string;
  /** Shown inside the box, after the text (e.g. "✓ Available"). */
  suffix?: ReactNode;
  /** Shown on the right of the label (e.g. "0 / 120"). */
  counter?: string;
};

/** Labelled text input, as in Edit profile: mono label, 46px box, 16px corners. */
export function Field({ label, hint, error, prefix, suffix, counter, multiline, style, editable = true, onFocus, onBlur, ...rest }: Props) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <MonoLabel bold>{label}</MonoLabel>
        {counter ? <MonoLabel>{counter}</MonoLabel> : null}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 4,
          minHeight: multiline ? 92 : 46,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: error ? c.danger : focused ? c.act : c.ln,
          backgroundColor: c.sf,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 12 : 0,
          opacity: editable ? 1 : 0.6,
        }}
      >
        {prefix ? <Txt color="mu">{prefix}</Txt> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={c.mu}
          multiline={multiline}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              minWidth: 0,
              minHeight: multiline ? 66 : 44,
              fontFamily: fonts.regular,
              fontSize: 15,
              lineHeight: multiline ? 22 : undefined,
              color: c.tx,
              textAlignVertical: multiline ? 'top' : 'center',
              outlineWidth: 0,
              outlineStyle: 'none',
            } as object,
            style,
          ]}
          {...rest}
        />
        {suffix}
      </View>
      {error ? (
        <Txt variant="small" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small" style={{ fontSize: 12, lineHeight: 17 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}
