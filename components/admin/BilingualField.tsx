"use client";

import { useAutoTranslate } from "@/lib/use-auto-translate";

type Props = {
  label: string;
  type?: "input" | "textarea";
  enValue: string;
  teValue: string;
  onChangeEn: (next: string) => void;
  onChangeTe: (next: string) => void;
  placeholderEn?: string;
  placeholderTe?: string;
  nameEn?: string;
  nameTe?: string;
  /** Triggered on blur of the English field — useful for slug derivation. */
  onBlurEn?: (value: string) => void;
  required?: boolean;
  textareaRows?: number;
};

const inputClass =
  "w-full bg-ivory border border-ink/15 focus:border-ink py-2.5 px-3 text-ink outline-none transition-colors text-sm";
const labelClass = "smallcaps text-[0.6rem] text-champagne-deep mb-1.5 inline-block";

export function BilingualField({
  label,
  type = "input",
  enValue,
  teValue,
  onChangeEn,
  onChangeTe,
  placeholderEn,
  placeholderTe,
  nameEn,
  nameTe,
  onBlurEn,
  required,
  textareaRows,
}: Props) {
  const { status, translateToEn, translateToTe, enWasAuto, teWasAuto } = useAutoTranslate({
    en: enValue,
    te: teValue,
    onSetEn: onChangeEn,
    onSetTe: onChangeTe,
  });

  const isLoading = status === "loading";

  const renderField = (
    value: string,
    onChange: (s: string) => void,
    placeholder?: string,
    name?: string,
    onBlur?: (v: string) => void
  ) => {
    if (type === "textarea") {
      return (
        <textarea
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
          placeholder={placeholder}
          rows={textareaRows ?? 4}
          className={`${inputClass} min-h-[100px] resize-y`}
        />
      );
    }
    return (
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
        placeholder={placeholder}
        required={required}
        className={inputClass}
      />
    );
  };

  const xlateBtnClass =
    "smallcaps text-[0.55rem] tracking-[0.18em] border border-ink/15 hover:border-ink/45 px-2.5 py-1 text-ink/75 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5";

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-medium text-ink">{label}</h3>
        {status === "error" && (
          <span className="text-[0.65rem] text-vermilion">
            Couldn&apos;t translate — try again or type manually.
          </span>
        )}
      </div>

      {/* English row */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <label className={`${labelClass} mb-0`}>English</label>
          <button
            type="button"
            onClick={() => void translateToEn()}
            disabled={isLoading || !teValue.trim()}
            className={xlateBtnClass}
            title="Translate the Telugu text into English"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-2.5 h-2.5 border border-ink/40 border-t-transparent rounded-full animate-spin" />
                Translating
              </>
            ) : (
              <>← Translate from Telugu</>
            )}
          </button>
        </div>
        {renderField(enValue, onChangeEn, placeholderEn, nameEn, onBlurEn)}
        {enWasAuto && (
          <p className="text-[0.65rem] text-champagne-deep mt-1 italic">
            Auto-translated from Telugu — please review.
          </p>
        )}
      </div>

      {/* Telugu row */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <label className={`${labelClass} mb-0`}>Telugu</label>
          <button
            type="button"
            onClick={() => void translateToTe()}
            disabled={isLoading || !enValue.trim()}
            className={xlateBtnClass}
            title="Translate the English text into Telugu"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-2.5 h-2.5 border border-ink/40 border-t-transparent rounded-full animate-spin" />
                Translating
              </>
            ) : (
              <>Translate from English →</>
            )}
          </button>
        </div>
        {renderField(teValue, onChangeTe, placeholderTe, nameTe)}
        {teWasAuto && (
          <p className="text-[0.65rem] text-champagne-deep mt-1 italic">
            Auto-translated from English — please review.
          </p>
        )}
      </div>
    </div>
  );
}
