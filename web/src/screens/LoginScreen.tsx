import { useState } from 'react'
import { motion } from 'framer-motion'
import { useColleagues, useLogin } from '../api/hooks'
import { AppHeader, Mark, Screen } from '../components/Shell'
import { Button } from '../components/Button'
import { Avatar } from '../components/ui'

export function LoginScreen() {
  const { data } = useColleagues()
  const login = useLogin()
  const [name, setName] = useState('')
  const colleagues = data?.colleagues ?? []
  const join = (n: string) => {
    const v = n.trim()
    if (v) login.mutate(v)
  }

  return (
    <Screen scrollKey="login">
      <AppHeader />
      <div className="flex flex-1 flex-col justify-center pb-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Mark className="mb-4 h-14 w-14" animated />
          <p className="font-sans text-2xs font-bold uppercase tracking-[0.16em] text-ink-faint">
            <span lang="ar" className="normal-case tracking-normal">صباح الفول</span> · good morning
          </p>
          <h1 className="mt-2 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink text-balance">
            Who’s<br />ordering?
          </h1>
          <p className="mt-3 max-w-[30ch] font-sans text-base text-ink-soft text-pretty">
            Type your name to join the table. No passwords — it’s just breakfast.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-7"
        >
          {colleagues.length > 0 && (
            <>
              <p className="mb-2 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">The team</p>
              <div className="mb-6 flex flex-wrap gap-2">
                {colleagues.map((c) => (
                  <button
                    key={c}
                    onClick={() => join(c)}
                    disabled={login.isPending}
                    className="tap inline-flex items-center gap-2 rounded-full bg-card-raised px-3 py-2 ring-1 ring-line-strong transition-colors hover:ring-clay disabled:opacity-50"
                  >
                    <Avatar name={c} size="sm" />
                    <span className="pr-1 font-sans text-sm font-semibold text-ink">{c}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div>
            <p className="mb-2 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              {colleagues.length > 0 ? 'or type a name' : 'your name — Arabic or English, your call'}
            </p>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && join(name)}
                placeholder="Your name · اسمك"
                aria-label="Your name"
                className="flex-1 rounded-lg bg-card-raised px-3 py-3 font-sans text-base font-semibold text-ink ring-1 ring-line-bold placeholder:text-ink-faint focus:ring-clay"
              />
              <Button onClick={() => join(name)} disabled={!name.trim() || login.isPending}>
                {login.isPending ? 'Joining…' : 'Join'}
              </Button>
            </div>
            {login.isError && (
              <p className="mt-2 font-sans text-sm text-clay-deep" role="alert">
                Couldn’t sign in — try again.
              </p>
            )}
            <p className="mt-4 font-sans text-xs text-ink-faint">
              Use the same name every day — it’s how the table knows your order is yours.
            </p>
          </div>
        </motion.div>
      </div>
    </Screen>
  )
}
