"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Search, ShieldCheck } from "lucide-react"
import { createChart, searchLocations } from "@/lib/api"
import type { AstroSystem, BirthData, LocationResult } from "@/lib/types"
import { useLang } from "@/lib/lang"

const systems: { id: AstroSystem; symbol: string }[] = [
  { id: "tropical", symbol: "☉" },
  { id: "vedic", symbol: "ॐ" },
  { id: "bazi", symbol: "天" },
]

const initial: BirthData = {
  system: "tropical",
  person_name: "",
  birth_date: "",
  birth_time: "",
  birth_city: "",
  birth_country: "",
  birth_timezone: "Asia/Kolkata",
  birth_latitude: 0,
  birth_longitude: 0,
}

export function BirthWizard({
  open,
  initialSystem,
  onClose,
}: {
  open: boolean
  initialSystem?: AstroSystem
  onClose: () => void
}) {
  const { lang, t } = useLang()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<BirthData>({ ...initial, system: initialSystem || "tropical" })
  const [query, setQuery] = useState("")
  const [locations, setLocations] = useState<LocationResult[]>([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (initialSystem) setForm((current) => ({ ...current, system: initialSystem }))
  }, [initialSystem])

  useEffect(() => {
    if (step !== 2 || query.trim().length < 2) {
      setLocations([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        setLocations(await searchLocations(query.trim(), lang, controller.signal))
      } catch (caught) {
        if (!controller.signal.aborted) setError((caught as Error).message)
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, lang, step])

  const ready = useMemo(() => {
    if (step === 1) return Boolean(form.person_name.trim() && form.birth_date && form.birth_time)
    if (step === 2) return Boolean(form.birth_city && form.birth_country && form.birth_timezone)
    return true
  }, [form, step])

  if (!open) return null

  const chooseLocation = (place: LocationResult) => {
    setForm({
      ...form,
      birth_city: place.name,
      birth_country: place.country,
      birth_timezone: place.timezone,
      birth_latitude: place.latitude,
      birth_longitude: place.longitude,
    })
    setQuery(`${place.name}, ${place.country}`)
    setLocations([])
  }

  const submit = async () => {
    setSubmitting(true)
    setError("")
    try {
      const result = await createChart(form)
      router.push(`/readings/${result.chart_id}`)
    } catch (caught) {
      setError((caught as Error).message.replaceAll("_", " "))
      setSubmitting(false)
    }
  }

  const labels = [t("select"), t("details"), t("place"), t("review")]
  return (
    <div className="wizard-backdrop" role="dialog" aria-modal="true" aria-label={t("newReading")}>
      <div className="wizard">
        <div className="wizard-topline">
          <button className="icon-button" onClick={onClose} aria-label={t("close")}>×</button>
          <span>Jyotir · {t("newReading")}</span>
          <span className="privacy-chip"><ShieldCheck size={14} /> {t("private")}</span>
        </div>
        <div className="wizard-progress" aria-label={`${t("stepOf")} ${step + 1} / 4`}>
          {labels.map((label, index) => (
            <div className={index <= step ? "progress-step active" : "progress-step"} key={label}>
              <span>{index < step ? <Check size={12} /> : index + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>

        <div className="wizard-body">
          {step === 0 && (
            <section>
              <p className="section-kicker">01 · {t("traditionLabel")}</p>
              <h2>{t("traditions")}</h2>
              <div className="wizard-systems">
                {systems.map(({ id, symbol }) => (
                  <button
                    key={id}
                    onClick={() => setForm({ ...form, system: id })}
                    className={form.system === id ? `system-choice ${id} selected` : `system-choice ${id}`}
                  >
                    <span className="system-symbol">{symbol}</span>
                    <strong>{t(id)}</strong>
                    <small>{t(`${id}Sub` as any)}</small>
                    <span className="choice-check"><Check size={14} /></span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <p className="section-kicker">02 · {t("momentLabel")}</p>
              <h2>{t("details")}</h2>
              <div className="form-grid">
                <label className="field field-wide">
                  <span>{t("name")}</span>
                  <input value={form.person_name} maxLength={255} autoFocus onChange={(e) => setForm((current) => ({ ...current, person_name: e.target.value }))} />
                </label>
                <label className="field">
                  <span>{t("date")}</span>
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={form.birth_date} onChange={(e) => setForm((current) => ({ ...current, birth_date: e.target.value }))} />
                </label>
                <label className="field">
                  <span>{t("time")}</span>
                  <input type="time" value={form.birth_time} onChange={(e) => setForm((current) => ({ ...current, birth_time: e.target.value }))} />
                </label>
                <label className="field field-wide">
                  <span>{t("gender")}</span>
                  <select value={form.gender || ""} onChange={(e) => setForm((current) => ({ ...current, gender: (e.target.value || undefined) as BirthData["gender"] }))}>
                    <option value="">{t("genderNone")}</option>
                    <option value="female">{t("female")}</option>
                    <option value="male">{t("male")}</option>
                  </select>
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <p className="section-kicker">03 · {t("place")}</p>
              <h2>{t("place")}</h2>
              <label className="field location-search">
                <span>{t("city")}</span>
                <div><Search size={17} /><input value={query} autoFocus onChange={(e) => setQuery(e.target.value)} placeholder="New Delhi, India" />{searching && <Loader2 size={16} className="spin" />}</div>
              </label>
              {locations.length > 0 && (
                <div className="location-results">
                  {locations.map((place) => (
                    <button key={place.id} onClick={() => chooseLocation(place)}>
                      <MapPin size={16} />
                      <span><strong>{place.name}</strong><small>{[place.admin1, place.country].filter(Boolean).join(", ")}</small></span>
                      <small>{place.timezone}</small>
                    </button>
                  ))}
                </div>
              )}
              {form.birth_city && (
                <div className="manual-grid">
                  <label className="field"><span>{t("manualCity")}</span><input value={form.birth_city} onChange={(e) => setForm((current) => ({ ...current, birth_city: e.target.value }))} /></label>
                  <label className="field"><span>{t("country")}</span><input value={form.birth_country} onChange={(e) => setForm((current) => ({ ...current, birth_country: e.target.value }))} /></label>
                  <label className="field"><span>{t("timezone")}</span><input value={form.birth_timezone} onChange={(e) => setForm((current) => ({ ...current, birth_timezone: e.target.value }))} /></label>
                  <label className="field"><span>{t("latitude")}</span><input type="number" step="any" value={form.birth_latitude} onChange={(e) => setForm((current) => ({ ...current, birth_latitude: Number(e.target.value) }))} /></label>
                  <label className="field"><span>{t("longitude")}</span><input type="number" step="any" value={form.birth_longitude} onChange={(e) => setForm((current) => ({ ...current, birth_longitude: Number(e.target.value) }))} /></label>
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section>
              <p className="section-kicker">04 · {t("review")}</p>
              <h2>{t("review")}</h2>
              <div className={`review-card ${form.system}`}>
                <div className="review-orbit" aria-hidden="true"><span>{systems.find((s) => s.id === form.system)?.symbol}</span></div>
                <div>
                  <small>{t(form.system)} · {t(`${form.system}Sub` as any)}</small>
                  <h3>{form.person_name}</h3>
                  <p>{form.birth_date} · {form.birth_time}</p>
                  <p>{form.birth_city}, {form.birth_country}</p>
                  <p className="muted">{form.birth_timezone} · {form.birth_latitude.toFixed(3)}, {form.birth_longitude.toFixed(3)}</p>
                </div>
              </div>
              <div className="convention-note"><ShieldCheck size={18} /><p>{t("convention")}<br /><small>{t("privateBody")}</small></p></div>
            </section>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <div className="wizard-actions">
          <button className="button ghost" onClick={() => step === 0 ? onClose() : setStep(step - 1)}><ArrowLeft size={16} /> {t("back")}</button>
          {step < 3 ? (
            <button className="button primary" disabled={!ready} onClick={() => setStep(step + 1)}>{t("continue")} <ArrowRight size={16} /></button>
          ) : (
            <button className="button primary" disabled={submitting} onClick={submit}>{submitting ? <Loader2 className="spin" size={17} /> : <SparkleMark />} {t("create")}</button>
          )}
        </div>
      </div>
    </div>
  )
}

function SparkleMark() {
  return <span aria-hidden="true">✦</span>
}
