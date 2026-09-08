import { useState, type FormEvent } from 'react'
import { contact } from '../content/portfolio'

type Status = 'idle' | 'sending' | 'sent' | 'error'

// Formspree endpoint id is public (same as form action URL). Env override optional.
const FORMSPREE_ID =
  ((import.meta.env.VITE_FORMSPREE_ID as string | undefined)?.trim() || 'mbgrolgv')

export function ContactPanel() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const configured = FORMSPREE_ID.length > 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!configured || status === 'sending') return

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedMessage = message.trim()
    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setStatus('error')
      setErrorMsg('Please fill in all fields.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus('error')
      setErrorMsg('Enter a valid email address.')
      return
    }

    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
          _subject: `Portfolio contact from ${trimmedName}`,
        }),
      })
      if (!res.ok) throw new Error('send failed')
      setStatus('sent')
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setStatus('error')
      setErrorMsg('Could not send. Try again or email me directly.')
    }
  }

  return (
    <div className="contact-panel" data-testid="contact-panel">
      <p className="contact-panel__lead" data-reveal>{contact.description}</p>

      <form className="contact-form" onSubmit={onSubmit} noValidate data-reveal-stagger>
        <label className="contact-field" data-reveal>
          <span>Name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status === 'sending' || status === 'sent'}
            required
          />
        </label>
        <label className="contact-field" data-reveal>
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'sending' || status === 'sent'}
            required
          />
        </label>
        <label className="contact-field" data-reveal>
          <span>Message</span>
          <textarea
            name="message"
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={status === 'sending' || status === 'sent'}
            required
          />
        </label>

        {!configured && (
          <p className="contact-form__hint">
            Contact form is not configured.
          </p>
        )}

        {status === 'sent' ? (
          <p className="contact-form__status contact-form__status--ok" role="status">
            Message sent — I&apos;ll get back to you.
          </p>
        ) : (
          <button
            type="submit"
            className="contact-form__submit"
            disabled={!configured || status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Send message'}
          </button>
        )}

        {status === 'error' && (
          <p className="contact-form__status contact-form__status--err" role="alert">
            {errorMsg}
          </p>
        )}
      </form>

      <a className="contact-panel__email" href={`mailto:${contact.email}`} data-reveal="card">
        <span className="contact-panel__email-label">Or email me directly</span>
        <span className="contact-panel__email-value">{contact.email}</span>
      </a>

      <div className="tags" data-reveal-stagger>
        {contact.links.map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer" data-reveal="left">
            {l.label}
          </a>
        ))}
      </div>

      <dl className="contact-panel__meta" data-reveal-stagger>
        {contact.meta.map((m) => (
          <div key={m.label} data-reveal="left">
            <dt>{m.label}</dt>
            <dd>{m.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
