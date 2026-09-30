import { useEffect, useRef, useState } from 'react';
import {
  suggestAddress,
  cleanAddress,
  type AddressVariant,
} from '../lib/api';

const C = {
  text: '#1A1D21',
  textSec: '#6E7681',
  border: '#E6E9ED',
};

const styles = {
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    boxSizing: 'border-box' as const,
    outline: 'none',
    background: '#fff',
  },
  list: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    zIndex: 1000,
    maxHeight: 220,
    overflowY: 'auto' as const,
    marginTop: 4,
  },
  item: {
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: 14,
    color: C.text,
  },
  loader: {
    position: 'absolute' as const,
    right: 12,
    top: 10,
    color: C.textSec,
    fontSize: 13,
  },
  hint: { fontSize: 12, color: C.textSec, margin: '6px 0 0' },
};

export interface AddressChange {
  address: string;
  city: string;
}

interface Props {
  value: string;
  onChange: (a: AddressChange) => void;
  placeholder?: string;
}

export function AddressInput({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressVariant[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);

  const selectedRef = useRef(true);      // выбран ли адрес из подсказок
  const lastCityRef = useRef('');        // последний определённый город

  // Синхронизация с внешним значением, если оно реально изменилось извне
  useEffect(() => {
    setQuery((prev) => {
      if (prev !== value) {
        selectedRef.current = true;
        return value;
      }
      return prev;
    });
  }, [value]);

  // Подсказки: при любой ошибке DaData молча уходим в деградированный режим
  useEffect(() => {
    if (selectedRef.current || degraded) return;
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await suggestAddress(query);
        if (res.degraded) {
          setDegraded(true);
          setSuggestions([]);
          setOpen(false);
        } else {
          setSuggestions(res.suggestions);
          setOpen(res.suggestions.length > 0);
        }
      } catch {
        setDegraded(true);
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [query, degraded]);

  const applyVariant = (v: AddressVariant) => {
    selectedRef.current = true;
    lastCityRef.current = v.city ?? '';
    setQuery(v.value);
    setOpen(false);
    setSuggestions([]);
    onChange({
      address: v.value,
      city: v.city ?? '',
    });
  };

  const handleBlur = () => {
    window.setTimeout(async () => {
      setOpen(false);
      if (selectedRef.current || !query.trim()) return;

      // Деградированный режим: отдаём как есть
      if (degraded) {
        onChange({ address: query, city: lastCityRef.current });
        return;
      }

      try {
        const res = await cleanAddress(query);
        if (res.degraded) {
          setDegraded(true);
          onChange({ address: query, city: lastCityRef.current });
          return;
        }
        if (res.address) {
          applyVariant(res.address);
        } else {
          // Адрес не найден в DaData — оставляем введённую строку как есть
          onChange({ address: query, city: lastCityRef.current });
        }
      } catch {
        setDegraded(true);
        onChange({ address: query, city: lastCityRef.current });
      }
    }, 200);
  };

  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <input
        style={styles.input}
        value={query}
        placeholder={placeholder ?? 'Город, улица, дом'}
        onChange={(e) => {
          selectedRef.current = false;
          const val = e.target.value;
          setQuery(val);
          // Сразу отдаём сырую строку родителю — адрес актуален даже без blur
          onChange({ address: val, city: lastCityRef.current });
        }}
        onFocus={() => {
          if (!degraded && suggestions.length) setOpen(true);
        }}
        onBlur={handleBlur}
      />
      {loading && !degraded && <span style={styles.loader}>…</span>}
      {!degraded && open && suggestions.length > 0 && (
        <div style={styles.list}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              style={{
                ...styles.item,
                borderBottom:
                  i === suggestions.length - 1
                    ? 'none'
                    : `1px solid ${C.border}`,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                applyVariant(s);
              }}
            >
              {s.value}
            </div>
          ))}
        </div>
      )}
      {degraded && (
        <p style={styles.hint}>
          Подсказки адресов временно недоступны — введите адрес вручную.
        </p>
      )}
    </div>
  );
}