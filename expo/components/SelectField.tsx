import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

export interface SelectOption {
  value: string;
  label?: string;
  hint?: string;
  leading?: string;
}

interface Props {
  label?: string;
  value: string | null | undefined;
  options: (string | SelectOption)[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  title?: string;
  /** Let the user use what they typed when it isn't in the list. */
  allowCustom?: boolean;
  /** Show a "Clear" row (for optional filters). */
  clearable?: boolean;
  disabled?: boolean;
  testID?: string;
  displayValue?: string;
}

const toOption = (o: string | SelectOption): SelectOption => (typeof o === 'string' ? { value: o } : o);

export default function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  title,
  allowCustom,
  clearable,
  disabled,
  testID,
  displayValue,
}: Props) {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const opts = useMemo(() => options.map(toOption), [options]);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? opts.filter((o) => (o.label ?? o.value).toLowerCase().includes(q) || o.value.toLowerCase().includes(q)) : opts),
    [opts, q],
  );
  const exact = opts.some((o) => o.value.toLowerCase() === q);
  const selected = opts.find((o) => o.value === value);
  const shown = displayValue ?? (selected ? `${selected.leading ? selected.leading + '  ' : ''}${selected.label ?? selected.value}` : value ?? '');

  const pick = (v: string | null) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.field, disabled && styles.disabled, pressed && styles.pressed]}
        onPress={() => !disabled && setOpen(true)}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label ?? title ?? placeholder}
      >
        <Text style={[styles.value, !shown && styles.placeholder]} numberOfLines={1}>
          {shown || placeholder}
        </Text>
        <ChevronDown size={18} color={Colors.textSecondary} />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>{title ?? label ?? placeholder}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} testID={testID ? `${testID}-close` : undefined}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <Search size={16} color={Colors.textLight} />
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder={allowCustom ? 'Search or type your own' : 'Search'}
              placeholderTextColor={Colors.textLight}
              autoFocus={Platform.OS === 'web'}
              autoCorrect={false}
              testID={testID ? `${testID}-search` : undefined}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                {allowCustom && q && !exact ? (
                  <Pressable style={styles.row} onPress={() => pick(query.trim())} testID={testID ? `${testID}-custom` : undefined}>
                    <Plus size={16} color={Colors.primary} />
                    <Text style={[styles.rowText, styles.custom]}>Use “{query.trim()}”</Text>
                  </Pressable>
                ) : null}
                {clearable && value ? (
                  <Pressable style={styles.row} onPress={() => pick(null)} testID={testID ? `${testID}-clear` : undefined}>
                    <X size={16} color={Colors.textSecondary} />
                    <Text style={[styles.rowText, { color: Colors.textSecondary }]}>Clear selection</Text>
                  </Pressable>
                ) : null}
              </>
            }
            ListEmptyComponent={<Text style={styles.empty}>{allowCustom ? 'No matches — type it to add your own.' : 'No matches.'}</Text>}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
                  onPress={() => pick(item.value)}
                  testID={testID ? `${testID}-option-${item.value.replace(/\s+/g, '-')}` : undefined}
                >
                  {item.leading ? <Text style={styles.leading}>{item.leading}</Text> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.label ?? item.value}</Text>
                    {item.hint ? <Text style={styles.hint}>{item.hint}</Text> : null}
                  </View>
                  {active ? <Check size={18} color={Colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  value: { flex: 1, fontSize: 15, color: Colors.text },
  placeholder: { color: Colors.textLight },
  sheet: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  search: { flex: 1, paddingVertical: 12, fontSize: 15, color: Colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowActive: { backgroundColor: Colors.primaryLight },
  rowText: { fontSize: 15, color: Colors.text },
  rowTextActive: { fontWeight: '700', color: Colors.primaryDark },
  custom: { color: Colors.primary, fontWeight: '600' },
  leading: { fontSize: 20 },
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textSecondary, padding: 24 },
});
