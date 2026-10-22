# Femora Backend — Frontend Integration Guide

دليل مستقل لمطوّر الفرونت إند لربط Femora Backend بالواجهة. الأمثلة باستخدام **TypeScript + Axios**، ويمكن تعديلها بسهولة لاستخدام JavaScript أو `fetch`.

> هذا الدليل مبني على ملفات `routes/` و`controllers/` و`models/` الموجودة في الريبو. لا تفترض وجود API للأطفال أو endpoint لجلب بيانات المستخدم الحالي؛ هذه المسارات غير موجودة في الـ routes الحالية.

## 1. معلومات الاتصال

- **Production API:** `https://femora-backend-v3hw.onrender.com/api/v1`
- **Local API:** `http://localhost:8080/api/v1`
- **Authentication:** JWT في هيدر `Authorization: Bearer <token>`
- الطلبات التي تحتوي على body ترسل JSON مع `Content-Type: application/json`.

أنشئ `.env.local` في جذر مشروع Next.js:

```env
NEXT_PUBLIC_API_BASE_URL=https://femora-backend-v3hw.onrender.com/api/v1
```

للتطوير المحلي، غيّر القيمة إلى:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```

أعد تشغيل dev server بعد تغيير متغيرات البيئة. لا تضع `JWT_SECRET` أو `DATABASE_URL` في أي متغير يبدأ بـ `NEXT_PUBLIC_`.

## 2. خريطة الـ endpoints

| Method | Endpoint | Auth | الغرض |
|---|---|---|---|
| `POST` | `/signup` | لا | إنشاء حساب |
| `POST` | `/login` | لا | تسجيل الدخول |
| `GET` | `/weeks` | لا | جلب كل أسابيع الحمل |
| `GET` | `/weeks/:weekNumber` | لا | جلب أسبوع محدد |
| `PATCH` | `/weeks/:weekNumber` | JWT + دور `admin` | تعديل أسبوع |
| `POST` | `/create-pregnancy` | JWT | تسجيل حمل |
| `GET` | `/get-pregnancy` | JWT | جلب الأحمال الخاصة بالمستخدم |
| `PATCH` | `/update-pregnancy` | JWT | تحديث تاريخ آخر دورة للحمل |

كل المسارات أعلاه مسبوقة بـ `/api/v1`.

## 3. تثبيت Axios وإنشاء API client

```bash
npm install axios
```

أنشئ `src/lib/api.ts`:

```ts
import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://femora-backend-v3hw.onrender.com/api/v1";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // لا نضيف token إلى signup/login أو الطلبات العامة إلا إذا كان محفوظًا.
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("femora_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { message?: string; error?: string }
      | undefined;

    if (body?.message) return body.message;
    if (body?.error) return body.error;
    if (!error.response) {
      return "تعذر الاتصال بالسيرفر. راجع عنوان API والاتصال وCORS.";
    }
    return `حصل خطأ من السيرفر (HTTP ${error.response.status}).`;
  }

  return error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
}
```

> ملاحظة أمنية: `localStorage` سهل الاستخدام لكنه متاح لأي JavaScript يعمل على الصفحة؛ احمِ التطبيق من XSS. إذا كنت تحتاج جلسة أكثر أمانًا، ففكّر في تصميم يعتمد على HttpOnly cookies من جهة الباك إند. لا تحفظ كلمة المرور في المتصفح.

## 4. Authentication — التسجيل والدخول والخروج

أنشئ `src/lib/auth-api.ts`:

```ts
import { api } from "./api";

export type User = {
  id: string;
  name: string;
  email: string;
};

export type AuthResult = {
  message: string;
  token: string;
  user?: User;
};

export const authApi = {
  async signUp(input: { name: string; email: string; password: string }) {
    const { data } = await api.post<AuthResult>("/signup", input);
    if (data.token) localStorage.setItem("femora_token", data.token);
    if (data.user) localStorage.setItem("femora_user", JSON.stringify(data.user));
    return data;
  },

  async login(input: { email: string; password: string }) {
    const { data } = await api.post<AuthResult>("/login", input);
    if (data.token) localStorage.setItem("femora_token", data.token);
    // /login لا يرجع user حاليًا؛ لا تفترض وجود data.user.
    return data;
  },

  logout() {
    localStorage.removeItem("femora_token");
    localStorage.removeItem("femora_user");
  },

  getToken() {
    return typeof window === "undefined"
      ? null
      : localStorage.getItem("femora_token");
  },

  getSavedUser(): User | null {
    if (typeof window === "undefined") return null;
    const value = localStorage.getItem("femora_user");
    if (!value) return null;
    try {
      return JSON.parse(value) as User;
    } catch {
      localStorage.removeItem("femora_user");
      return null;
    }
  },
};
```

### إنشاء حساب

`POST /signup`

Body:

```json
{
  "name": "Sara",
  "email": "sara@example.com",
  "password": "password123"
}
```

نجاح متوقع (`201`):

```json
{
  "message": "اليوزر اتعمل بنجاح",
  "token": "<jwt>",
  "user": {
    "id": "<user-id>",
    "name": "Sara",
    "email": "sara@example.com"
  }
}
```

الباسورد يجب أن يكون 8 أحرف على الأقل، والإيميل لازم يكون صالحًا. قد ترجع أخطاء التحقق أو تكرار الإيميل برسالة خطأ.

### تسجيل الدخول

`POST /login`

Body:

```json
{
  "email": "sara@example.com",
  "password": "password123"
}
```

نجاح متوقع (`200`):

```json
{
  "message": "تسجيل الدخول تم بنجاح",
  "token": "<jwt>"
}
```

**مهم:** endpoint تسجيل الدخول لا يرجع بيانات المستخدم حاليًا؛ هو يرجع `token` و`message` فقط.

### مثال استعمال داخل Client Component

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/auth-api";
import { getApiError } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.login({ email, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        البريد الإلكتروني
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        كلمة المرور
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button disabled={loading} type="submit">
        {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
```

لفّ طلب التسجيل بنفس الفكرة باستخدام `authApi.signUp({ name, email, password })`.

### تسجيل الخروج

```ts
import { authApi } from "@/lib/auth-api";
import { useRouter } from "next/navigation";

const router = useRouter();

function handleLogout() {
  authApi.logout();
  router.replace("/login");
}
```

الخروج هنا يمسح التوكن من الفرونت فقط؛ لا يوجد endpoint logout في الباك إند حاليًا. لا يوجد كذلك endpoint لتجديد التوكن أو لجلب المستخدم الحالي.

## 5. Pregnancy API

كل مسارات الحمل محمية بـ JWT؛ الـ interceptor في `src/lib/api.ts` يضيف التوكن تلقائيًا إذا كان موجودًا.

أنشئ `src/lib/pregnancy-api.ts`:

```ts
import { api } from "./api";

export type Pregnancy = {
  _id: string;
  user: string;
  lastPeriodDate: string;
  dueDate: string;
  currentWeek: number;
  currentDay: number;
  createdAt?: string;
  updatedAt?: string;
};

export const pregnancyApi = {
  async create(lastPeriodDate: string) {
    const { data } = await api.post<{
      message: string;
      pregnancy: Pregnancy;
    }>("/create-pregnancy", { lastPeriodDate });
    return data;
  },

  async getAll() {
    const { data } = await api.get<{
      message: string;
      pregnancies: Pregnancy[];
    }>("/get-pregnancy");
    return data;
  },

  async update(lastPeriodDate: string) {
    const { data } = await api.patch<{
      message: string;
      pregnancy: Pregnancy;
    }>("/update-pregnancy", { lastPeriodDate });
    return data;
  },
};
```

### تسجيل حمل جديد

`POST /create-pregnancy`

Body:

```json
{
  "lastPeriodDate": "2026-07-01"
}
```

`lastPeriodDate` لازم يكون نصًا بصيغة `YYYY-MM-DD`، ولا يمكن أن يكون في المستقبل. الباك إند يحسب موعد الولادة بإضافة 280 يومًا، ويحسب `currentWeek` و`currentDay`.

نجاح متوقع (`201`):

```json
{
  "message": "تم إنشاء الحمل بنجاح",
  "pregnancy": {
    "_id": "<pregnancy-id>",
    "user": "<user-id>",
    "lastPeriodDate": "2026-07-01T00:00:00.000Z",
    "dueDate": "2027-04-07T00:00:00.000Z",
    "currentWeek": 16,
    "currentDay": 0
  }
}
```

القيم في المثال توضيحية؛ البيانات الفعلية تعتمد على تاريخ الطلب. `currentWeek` و`currentDay` محسوبان بالنسبة لتاريخ اليوم عند تنفيذ الطلب.

### جلب بيانات الحمل

`GET /get-pregnancy`

لا يحتاج body. النجاح يرجع كائنًا يحتوي على مصفوفة `pregnancies`:

```json
{
  "message": "تم جلب الأحمال بنجاح",
  "pregnancies": [
    {
      "_id": "<pregnancy-id>",
      "user": "<user-id>",
      "lastPeriodDate": "2026-07-01T00:00:00.000Z",
      "dueDate": "2027-04-07T00:00:00.000Z",
      "currentWeek": 16,
      "currentDay": 0
    }
  ]
}
```

إذا لم يوجد حمل، يرجع الباك إند `404` ورسالة `مفيش حمل مسجل للحساب ده`.

### تحديث الحمل

`PATCH /update-pregnancy`

Body:

```json
{
  "lastPeriodDate": "2026-07-05"
}
```

الاستجابة الناجحة ترجع `{ message, pregnancy }`. المسار الحالي يبحث عن حمل المستخدم ويحدّثه؛ لو لم يجد حملًا يرجع `404`. لا ترسل `dueDate` أو `currentWeek` أو `currentDay`؛ الباك إند يحسبها من `lastPeriodDate`.

### مثال استخدام داخل مكوّن

```tsx
"use client";

import { useState } from "react";
import { pregnancyApi } from "@/lib/pregnancy-api";
import { getApiError } from "@/lib/api";

export function PregnancyForm() {
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await pregnancyApi.create(lastPeriodDate);
      setMessage(result.message);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        أول يوم في آخر دورة شهرية
        <input
          type="date"
          value={lastPeriodDate}
          onChange={(e) => setLastPeriodDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "جاري الحفظ..." : "حفظ بيانات الحمل"}
      </button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
```

## 6. Weeks API

أنشئ `src/lib/weeks-api.ts`:

```ts
import { api } from "./api";

export type PregnancyWeek = {
  _id: string;
  weekNumber: string;
  babySize?: string;
  WhappenInBody?: string;
  sympotyms?: string;
  babyLooks?: string;
  option1?: string;
  option2?: string;
  [key: string]: unknown;
};

export const weeksApi = {
  async getAll() {
    const { data } = await api.get<PregnancyWeek[]>("/weeks");
    return data;
  },

  async getByNumber(weekNumber: string | number) {
    const { data } = await api.get<PregnancyWeek | null>(
      `/weeks/${encodeURIComponent(String(weekNumber))}`
    );
    return data;
  },

  async update(
    weekNumber: string | number,
    changes: Partial<Omit<PregnancyWeek, "_id" | "weekNumber">>
  ) {
    const { data } = await api.patch<PregnancyWeek | null>(
      `/weeks/${encodeURIComponent(String(weekNumber))}`,
      changes
    );
    return data;
  },
};
```

**أسماء الحقول كما هي في الموديل الحالي:** `WhappenInBody` و`sympotyms` (بتهجئتهم الحالية). لا تغيّرها في الفرونت قبل تغيير الـ API أو البيانات في الباك إند.

### جلب كل الأسابيع

`GET /weeks`

الاستجابة مصفوفة مباشرة، وليست `{ weeks: [...] }`:

```json
[
  {
    "_id": "<week-id>",
    "weekNumber": "12",
    "babySize": "مثال",
    "WhappenInBody": "مثال",
    "sympotyms": "مثال",
    "babyLooks": "مثال",
    "option1": "مثال",
    "option2": "مثال"
  }
]
```

### جلب أسبوع واحد

`GET /weeks/12`

الاستجابة كائن الأسبوع مباشرة، أو `null` إذا لم يتم العثور على الأسبوع.

### تعديل أسبوع

`PATCH /weeks/12`

Body مثال:

```json
{
  "babySize": "تحديث حجم الجنين",
  "WhappenInBody": "تحديث معلومات الجسم"
}
```

المسار يتطلب JWT **ودور المستخدم `admin`**. الحساب العادي بدور `mom` لا يملك صلاحية تعديل بيانات الأسابيع. لا تعرض أزرار تعديل الأسابيع للمستخدم العادي.

### مثال عرض الأسابيع

```tsx
"use client";

import { useEffect, useState } from "react";
import { weeksApi, type PregnancyWeek } from "@/lib/weeks-api";
import { getApiError } from "@/lib/api";

export default function WeeksList() {
  const [weeks, setWeeks] = useState<PregnancyWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    weeksApi
      .getAll()
      .then((data) => {
        if (active) setWeeks(data);
      })
      .catch((err) => {
        if (active) setError(getApiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p>جاري تحميل الأسابيع...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!weeks.length) return <p>لا توجد بيانات أسابيع حاليًا.</p>;

  return (
    <ul>
      {weeks.map((week) => (
        <li key={week._id}>
          <h2>الأسبوع {week.weekNumber}</h2>
          <p>{week.babySize}</p>
          <p>{week.WhappenInBody}</p>
          <p>{week.sympotyms}</p>
        </li>
      ))}
    </ul>
  );
}
```

## 7. معالجة الأخطاء

استخدم `try/catch` مع كل طلب:

```ts
import { getApiError } from "@/lib/api";

try {
  const result = await pregnancyApi.getAll();
  console.log(result.pregnancies);
} catch (error) {
  setError(getApiError(error));
}
```

نقاط مهمة:

- `400`: غالبًا بيانات ناقصة أو غير صحيحة.
- `401` أو خطأ توكن: تحقق من تسجيل الدخول؛ امسح التوكن ووجّه المستخدم إلى صفحة الدخول عند الحاجة.
- `403`: المستخدم لا يملك الصلاحية المطلوبة، مثل محاولة مستخدم غير admin تعديل الأسابيع.
- `404`: قد لا توجد بيانات حمل أو أسبوع مطلوب.
- `500`: خطأ داخلي في السيرفر.
- شكل الأخطاء ليس موحّدًا بالكامل في كل Controllers، لذلك لا تعتمد على أن كل استجابة خطأ تحتوي على نفس الحقول.
- إذا فشل الاتصال دون وجود `error.response`، تحقق من رابط السيرفر وCORS وحالة استضافة Render.

## 8. قيود حالية يجب أن يعرفها الفرونت إند

1. لا يوجد endpoint حاليًا لجلب بيانات المستخدم الحالي (`/me` مثلًا).
2. تسجيل الدخول لا يرجع بيانات المستخدم؛ يرجع `token` و`message` فقط.
3. لا يوجد endpoint لتسجيل الخروج أو تجديد JWT.
4. توجد مسارات الحمل الثلاثة المذكورة أعلاه، وكلها تتطلب JWT.
5. مسار تعديل الأسابيع يتطلب مستخدمًا بدور `admin`.
6. لا توجد مسارات CRUD للأطفال في `routes/` الحالية؛ لا تستدعِ `/children` أو ما يشابهها قبل إضافتها فعليًا للباك إند.
7. الباك إند يستخدم `lastPeriodDate` بصيغة `YYYY-MM-DD` ويحسب `dueDate` بإضافة 280 يومًا.
8. تأكد من إعداد CORS في الباك إند للسماح بعنوان نشر الفرونت إند. لا تضع أسرار السيرفر في كود المتصفح.

## 9. تنظيم ملفات مقترح للفرونت إند

```text
src/
  lib/
    api.ts
    auth-api.ts
    pregnancy-api.ts
    weeks-api.ts
  app/
    login/
      page.tsx
    signup/
      page.tsx
    dashboard/
      page.tsx
```

هذا التنظيم اقتراح فقط؛ يمكن نقل الملفات بما يناسب بنية مشروعك. اجعل طلبات HTTP في `src/lib/` بدل تكرار عناوين الـ endpoints داخل كل component.

## 10. Checklist قبل التسليم

- [ ] قيمة `NEXT_PUBLIC_API_BASE_URL` صحيحة.
- [ ] التسجيل يرسل `name`, `email`, `password`.
- [ ] الدخول يرسل `email`, `password`.
- [ ] التوكن يُحفظ بعد نجاح التسجيل أو الدخول.
- [ ] الطلبات المحمية ترسل `Authorization: Bearer <token>`.
- [ ] إنشاء الحمل يرسل `lastPeriodDate` بصيغة `YYYY-MM-DD`.
- [ ] واجهة الأسابيع تتعامل مع مصفوفة مباشرة من `GET /weeks`.
- [ ] تعديل الأسابيع لا يظهر إلا للمستخدم الإداري.
- [ ] كل طلب يعرض حالة loading ورسالة خطأ مناسبة.
- [ ] لا توجد استدعاءات لمسارات غير موجودة في الباك إند.
