import { Component } from 'react';
import i18n from '../i18n';
import Brand from './Brand';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // Do not log component state: it can contain names, expenses, or form credentials.
    console.error('QISMA_RENDER_ERROR');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        className="mx-auto my-12 max-w-lg rounded-3xl border border-line bg-surface p-7 shadow-card"
        aria-labelledby="error-heading"
      >
        <Brand />
        <p className="mt-10 text-sm font-semibold text-muted">{i18n.t('errorPage.eyebrow')}</p>
        <h1 id="error-heading" className="mt-3 text-3xl font-bold text-primary">
          {i18n.t('errorPage.title')}
        </h1>
        <p className="mt-4 leading-relaxed text-muted">{i18n.t('errorPage.description')}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-7 min-h-12 rounded-xl bg-action-primary px-6 py-3 font-semibold text-on-primary hover:bg-action-primary-hover"
        >
          {i18n.t('errorPage.reload')}
        </button>
      </main>
    );
  }
}
