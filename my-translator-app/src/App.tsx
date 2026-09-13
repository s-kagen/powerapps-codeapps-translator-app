import { useEffect, useMemo, useState } from "react";
import { ArrowSwap20Regular } from "@fluentui/react-icons";
import "./App.css";

import { MicrosoftTranslatorV2Service } from "./generated/services/MicrosoftTranslatorV2Service";
import type { Language } from "./generated/models/MicrosoftTranslatorV2Model";

const AUTO_DETECT = "auto";
const DEFAULT_TARGET_LANGUAGE = "en";
const MAX_TEXT_LENGTH = 5000;

function App() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_DETECT);
  const [targetLanguage, setTargetLanguage] = useState(
    DEFAULT_TARGET_LANGUAGE
  );

  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLanguage, setDetectedLanguage] =
    useState<Language | null>(null);

  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    void loadLanguages();
  }, []);

  const sortedLanguages = useMemo(() => {
    return [...languages]
      .filter((language) => Boolean(language.Code))
      .sort((a, b) =>
        (a.Name ?? a.Code ?? "").localeCompare(
          b.Name ?? b.Code ?? "",
          "ja"
        )
      );
  }, [languages]);

  const sourceLanguageName = useMemo(() => {
    if (sourceLanguage === AUTO_DETECT) {
      return (
        detectedLanguage?.Name ??
        detectedLanguage?.Code ??
        "自動検出"
      );
    }

    return getLanguageName(sourceLanguage);
  }, [sourceLanguage, detectedLanguage, sortedLanguages]);

  const targetLanguageName = useMemo(() => {
    return getLanguageName(targetLanguage);
  }, [targetLanguage, sortedLanguages]);

  function getLanguageName(code: string): string {
    const language = sortedLanguages.find(
      (item) => item.Code?.toLowerCase() === code.toLowerCase()
    );

    return language?.Name ?? language?.Code ?? code;
  }

  async function loadLanguages() {
    setIsLoadingLanguages(true);
    setErrorMessage("");

    try {
      const response =
        await MicrosoftTranslatorV2Service.Languages("translation");

      const languageData = response.data ?? [];

      setLanguages(languageData);

      const hasEnglish = languageData.some(
        (language) => language.Code?.toLowerCase() === "en"
      );

      if (!hasEnglish && languageData[0]?.Code) {
        setTargetLanguage(languageData[0].Code);
      }
    } catch (error) {
      console.error("Failed to load languages.", error);

      setErrorMessage(
        "対応言語を取得できませんでした。接続設定を確認して、再度お試しください。"
      );
    } finally {
      setIsLoadingLanguages(false);
    }
  }

  async function detectSourceLanguage(): Promise<Language | null> {
    const text = sourceText.trim();

    if (!text) {
      return null;
    }

    const response = await MicrosoftTranslatorV2Service.Detect({
      Text: text,
    });

    const detected = response.data ?? null;

    setDetectedLanguage(detected);

    return detected;
  }

  async function handleTranslate() {
    const text = sourceText.trim();

    if (!text) {
      setErrorMessage("翻訳する文章を入力してください。");
      return;
    }

    if (!targetLanguage) {
      setErrorMessage("翻訳先の言語を選択してください。");
      return;
    }

    setIsTranslating(true);
    setErrorMessage("");
    setCopyMessage("");

    try {
      let languageFrom: string | undefined;

      if (sourceLanguage === AUTO_DETECT) {
        await detectSourceLanguage();
        languageFrom = undefined;
      } else {
        languageFrom = sourceLanguage;
        setDetectedLanguage(null);
      }

      const response =
        await MicrosoftTranslatorV2Service.Translate(
          targetLanguage,
          {
            Text: text,
          },
          languageFrom,
          undefined,
          "plain"
        );

      setTranslatedText(response.data ?? "");
    } catch (error) {
      console.error("Translation failed.", error);

      setTranslatedText("");
      setErrorMessage(
        "翻訳を実行できませんでした。接続状態または入力内容を確認してください。"
      );
    } finally {
      setIsTranslating(false);
    }
  }

  function handleSwapLanguages() {
    if (!translatedText) {
      setErrorMessage(
        "言語を入れ替えるには、先に翻訳を実行してください。"
      );
      return;
    }

    if (sourceLanguage === AUTO_DETECT) {
      const detectedCode = detectedLanguage?.Code;

      if (!detectedCode) {
        setErrorMessage(
          "翻訳元の言語を確認できませんでした。もう一度翻訳を実行してください。"
        );
        return;
      }

      setSourceLanguage(targetLanguage);
      setTargetLanguage(detectedCode);
    } else {
      setSourceLanguage(targetLanguage);
      setTargetLanguage(sourceLanguage);
    }

    setSourceText(translatedText);
    setTranslatedText(sourceText);
    setDetectedLanguage(null);
    setErrorMessage("");
    setCopyMessage("");
  }

  function handleClear() {
    setSourceText("");
    setTranslatedText("");
    setDetectedLanguage(null);
    setErrorMessage("");
    setCopyMessage("");
  }

  async function handleCopy() {
    if (!translatedText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(translatedText);

      setCopyMessage("翻訳結果をコピーしました。");
      setErrorMessage("");

      window.setTimeout(() => {
        setCopyMessage("");
      }, 2500);
    } catch (error) {
      console.error("Copy failed.", error);

      setCopyMessage("");
      setErrorMessage(
        "コピーできませんでした。翻訳結果を選択してコピーしてください。"
      );
    }
  }

  function handleSourceKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "Enter"
    ) {
      event.preventDefault();
      void handleTranslate();
    }
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            BL
          </div>

          <div>
            <p className="brand-name">BlueLingo</p>
            <p className="brand-description">
              Translation Workspace
            </p>
          </div>
        </div>

        <div className="service-status">
          <span className="status-dot" aria-hidden="true" />
          Microsoft Translator V2
        </div>
      </header>

      <main className="main-content">
        <section className="hero-section">
          <div>
            <p className="eyebrow">SMART TRANSLATION</p>

            <h1>言葉の違いを、仕事の強みに。</h1>

            <p className="hero-description">
              入力された言語を自動で判定し、選択した言語へ翻訳します。
              海外向けメール、問い合わせ対応、資料作成をすばやく支援します。
            </p>
          </div>

          <div
            className="hero-badge"
            aria-label="アプリの特徴"
          >
            <span>自動言語検出</span>
            <strong>Detect &amp; Translate</strong>
          </div>
        </section>

        {errorMessage && (
          <div
            className="message message-error"
            role="alert"
          >
            <span
              className="message-icon"
              aria-hidden="true"
            >
              !
            </span>

            <span>{errorMessage}</span>

            <button
              type="button"
              className="message-close"
              onClick={() => setErrorMessage("")}
              aria-label="エラーメッセージを閉じる"
            >
              ×
            </button>
          </div>
        )}

        <section className="translator-card">
          <div className="language-toolbar">
            <div className="language-selector">
              <label htmlFor="source-language">
                翻訳元
              </label>

              <select
                id="source-language"
                value={sourceLanguage}
                onChange={(event) => {
                  setSourceLanguage(event.target.value);
                  setDetectedLanguage(null);
                  setErrorMessage("");
                }}
                disabled={
                  isLoadingLanguages || isTranslating
                }
              >
                <option value={AUTO_DETECT}>
                  言語を自動検出
                </option>

                {sortedLanguages.map((language) => (
                  <option
                    key={language.Code}
                    value={language.Code}
                  >
                    {language.Name ?? language.Code}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="swap-button"
              onClick={handleSwapLanguages}
              disabled={
                isLoadingLanguages ||
                isTranslating ||
                !translatedText
              }
              aria-label="翻訳元と翻訳先の言語を入れ替える"
              title="翻訳元と翻訳先の言語を入れ替える"
            >
              <ArrowSwap20Regular aria-hidden="true" />
            </button>

            <div className="language-selector">
              <label htmlFor="target-language">
                翻訳先
              </label>

              <select
                id="target-language"
                value={targetLanguage}
                onChange={(event) => {
                  setTargetLanguage(event.target.value);
                  setErrorMessage("");
                }}
                disabled={
                  isLoadingLanguages || isTranslating
                }
              >
                {sortedLanguages.map((language) => (
                  <option
                    key={language.Code}
                    value={language.Code}
                  >
                    {language.Name ?? language.Code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="translation-grid">
            <article className="translation-panel source-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-label">原文</p>
                  <h2>{sourceLanguageName}</h2>
                </div>

                <button
                  type="button"
                  className="text-button"
                  onClick={handleClear}
                  disabled={
                    (!sourceText && !translatedText) ||
                    isTranslating
                  }
                >
                  クリア
                </button>
              </div>

              <textarea
                value={sourceText}
                onChange={(event) => {
                  setSourceText(event.target.value);
                  setDetectedLanguage(null);
                  setCopyMessage("");
                  setErrorMessage("");
                }}
                onKeyDown={handleSourceKeyDown}
                placeholder="翻訳する文章を入力してください"
                maxLength={MAX_TEXT_LENGTH}
                disabled={isTranslating}
                aria-label="翻訳する文章"
              />

              <div className="panel-footer">
                <span>
                  {sourceText.length.toLocaleString()} /{" "}
                  {MAX_TEXT_LENGTH.toLocaleString()}文字
                </span>

                <span className="keyboard-hint">
                  Ctrl + Enter で翻訳
                </span>
              </div>
            </article>

            <article className="translation-panel result-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-label">
                    翻訳結果
                  </p>
                  <h2>{targetLanguageName}</h2>
                </div>

                <button
                  type="button"
                  className="copy-button"
                  onClick={() => void handleCopy()}
                  disabled={
                    !translatedText || isTranslating
                  }
                >
                  コピー
                </button>
              </div>

              <div
                className={`translation-result ${
                  !translatedText ? "is-empty" : ""
                }`}
                aria-live="polite"
                aria-busy={isTranslating}
              >
                {isTranslating ? (
                  <div className="loading-state">
                    <span
                      className="spinner"
                      aria-hidden="true"
                    />
                    <span>翻訳しています...</span>
                  </div>
                ) : (
                  translatedText ||
                  "翻訳結果がここに表示されます"
                )}
              </div>

              <div className="panel-footer">
                <span>
                  {translatedText.length.toLocaleString()}
                  文字
                </span>

                {copyMessage && (
                  <span
                    className="copy-message"
                    role="status"
                  >
                    {copyMessage}
                  </span>
                )}
              </div>
            </article>
          </div>

          <div className="action-area">
            <div className="detected-information">
              {sourceLanguage === AUTO_DETECT &&
                detectedLanguage?.Code && (
                  <>
                    <span className="detected-label">
                      検出結果
                    </span>

                    <strong>
                      {detectedLanguage.Name ??
                        detectedLanguage.Code}
                    </strong>

                    <span className="language-code">
                      {detectedLanguage.Code}
                    </span>
                  </>
                )}
            </div>

            <button
              type="button"
              className="translate-button"
              onClick={() => void handleTranslate()}
              disabled={
                !sourceText.trim() ||
                !targetLanguage ||
                isTranslating ||
                isLoadingLanguages
              }
            >
              {isTranslating ? (
                <>
                  <span
                    className="button-spinner"
                    aria-hidden="true"
                  />
                  翻訳中
                </>
              ) : (
                <>
                  翻訳を実行
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        </section>

        <section
          className="feature-grid"
          aria-label="アプリの主な機能"
        >
          <div className="feature-item">
            <span className="feature-number">01</span>

            <div>
              <h3>言語を自動検出</h3>
              <p>
                入力内容から翻訳元の言語を判定します。
              </p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-number">02</span>

            <div>
              <h3>多言語に対応</h3>
              <p>
                コネクターから取得した対応言語を選択できます。
              </p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-number">03</span>

            <div>
              <h3>すぐに再利用</h3>
              <p>
                翻訳結果をコピーして業務ですぐに利用できます。
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>BlueLingo Translation Workspace</span>
        <span>Powered by Microsoft Translator V2</span>
      </footer>
    </div>
  );
}

export default App;