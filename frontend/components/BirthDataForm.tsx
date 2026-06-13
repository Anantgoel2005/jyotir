"use client"

import { useState } from "react"
import { ArrowLeft, Loader2, MapPin } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { submitBirthData } from "@/lib/api"
import { AstroSystem, BirthData } from "@/lib/types"
import { useLang } from "@/lib/lang"

const birthDataSchema = z.object({
  person_name: z.string().min(1, "Name is required").max(255),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  birth_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour format (HH:MM)"),
  birth_city: z.string().optional().default(""),
  birth_country: z.string().optional().default(""),
  birth_timezone: z.string().min(1, "Timezone is required"),
  birth_latitude: z.coerce.number().min(-90).max(90).optional(),
  birth_longitude: z.coerce.number().min(-180).max(180).optional(),
  gender: z.string().optional(),
})

type FormData = z.infer<typeof birthDataSchema>

const COMMON_TIMEZONES = [
  { label: "Asia/Kolkata (IST, +5:30)", value: "Asia/Kolkata" },
  { label: "America/New_York (EST/EDT)", value: "America/New_York" },
  { label: "America/Los_Angeles (PST/PDT)", value: "America/Los_Angeles" },
  { label: "Europe/London (GMT/BST)", value: "Europe/London" },
  { label: "Asia/Dubai (GST, +4)", value: "Asia/Dubai" },
  { label: "Asia/Singapore (SGT, +8)", value: "Asia/Singapore" },
  { label: "Europe/Paris (CET/CEST)", value: "Europe/Paris" },
]

interface Props {
  system: AstroSystem
  onBack: () => void
  onStreamingBreakdown: (chartId: string, personName: string) => void
}

export function BirthDataForm({ system, onBack, onStreamingBreakdown }: Props) {
  const { t } = useLang()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(birthDataSchema),
    defaultValues: { birth_timezone: "Asia/Kolkata", birth_country: "India" },
  })

  const isBazi = system === "bazi"

  const onSubmit = async (data: FormData) => {
    setError(null)
    setSubmitting(true)
    try {
      const payload: BirthData = {
        system,
        person_name: data.person_name,
        birth_date: data.birth_date,
        birth_time: data.birth_time,
        birth_timezone: data.birth_timezone,
        birth_city: data.birth_city || "",
        birth_country: data.birth_country || "",
        birth_latitude: data.birth_latitude ?? 0,
        birth_longitude: data.birth_longitude ?? 0,
        gender: data.gender,
      }
      const result = await submitBirthData(payload)
      onStreamingBreakdown(result.chart_id, data.person_name)
    } catch (e: any) {
      setError(e.message || "Something went wrong")
      setSubmitting(false)
    }
  }

  const systemLabel = t(system + "Label")

  return (
    <div className="max-w-lg mx-auto pt-8 pb-16">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {t("backToSystems")}
      </button>

      <div className="mb-8">
        <div className="text-amber-400/10 text-4xl mb-1" style={{ fontFamily: "serif" }}>ॐ</div>
        <h2 className="text-2xl font-bold mb-2 text-gold-spiritual" style={{ fontFamily: "var(--font-playfair)" }}>
          {t("enterBirth")}
        </h2>
        <p className="text-sm text-zinc-500">
          System: {systemLabel}
          {isBazi ? " · " + t("coordinatesAuto") : " · " + t("allRequired")}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="animate-slide-up" style={{ animationDelay: "0ms" }}>
          <label className="block text-sm font-medium mb-1.5 text-zinc-300">{t("fullName")}</label>
          <input {...register("person_name")} placeholder={t("lang") === "hi" ? "उदा. अनंत शर्मा" : "e.g. Anant Sharma"} className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all" />
          {errors.person_name && <p className="text-xs text-red-400 mt-1">{errors.person_name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-300">{t("birthDate")}</label>
            <input type="date" {...register("birth_date")} className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-zinc-100 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all [color-scheme:dark]" />
            {errors.birth_date && <p className="text-xs text-red-400 mt-1">{errors.birth_date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-300">{t("birthTime")}</label>
            <input type="time" {...register("birth_time")} className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-zinc-100 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all [color-scheme:dark]" />
            {errors.birth_time && <p className="text-xs text-red-400 mt-1">{errors.birth_time.message}</p>}
          </div>
        </div>

        {!isBazi ? (
          <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-zinc-300">{t("cityOfBirth")}</label>
              <input {...register("birth_city")} placeholder={t("lang") === "hi" ? "उदा. नई दिल्ली" : "e.g. New Delhi"} className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all" />
              {errors.birth_city && <p className="text-xs text-red-400 mt-1">{errors.birth_city.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-zinc-300">{t("country")}</label>
              <input {...register("birth_country")} placeholder={t("lang") === "hi" ? "उदा. भारत" : "e.g. India"} className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all" />
              {errors.birth_country && <p className="text-xs text-red-400 mt-1">{errors.birth_country.message}</p>}
            </div>
          </div>
        ) : (
          <>
            <input type="hidden" {...register("birth_city")} value="Unknown" />
            <input type="hidden" {...register("birth_country")} value="Unknown" />
          </>
        )}

        <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <label className="block text-sm font-medium mb-1.5 text-zinc-300">{t("timezone")}</label>
          <select {...register("birth_timezone")} className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-zinc-100 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all [color-scheme:dark]">
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value} className="bg-zinc-900">{tz.label}</option>
            ))}
          </select>
        </div>

        {!isBazi && (
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <label className="block text-sm font-medium mb-1.5 text-zinc-300">{t("coordinates")}</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input type="number" step="any" {...register("birth_latitude")} placeholder={t("lang") === "hi" ? "अक्षांश (उदा. 28.6139)" : "Latitude (e.g. 28.6139)"} className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all" />
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              </div>
              <input type="number" step="any" {...register("birth_longitude")} placeholder={t("lang") === "hi" ? "देशांतर (उदा. 77.2090)" : "Longitude (e.g. 77.2090)"} className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all" />
            </div>
            {(errors.birth_latitude || errors.birth_longitude) && (
              <p className="text-xs text-red-400 mt-1">{errors.birth_latitude?.message || errors.birth_longitude?.message}</p>
            )}
          </div>
        )}

        <div className="animate-slide-up" style={{ animationDelay: "250ms" }}>
          <label className="block text-sm font-medium mb-1.5 text-zinc-300">{t("gender")} <span className="text-zinc-600">({t("optional")})</span></label>
          <select {...register("gender")} className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-zinc-100 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all [color-scheme:dark]">
            <option value="" className="bg-zinc-900">{t("lang") === "hi" ? "बताना नहीं चाहते" : "Prefer not to say"}</option>
            <option value="male" className="bg-zinc-900">{t("lang") === "hi" ? "पुरुष" : "Male"}</option>
            <option value="female" className="bg-zinc-900">{t("lang") === "hi" ? "महिला" : "Female"}</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />{t("calculating")}</> : t("generateReading")}
        </button>
      </form>
    </div>
  )
}
