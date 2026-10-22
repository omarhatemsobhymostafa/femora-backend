# Pregnancy Weeks — دليل ربط الفرونت إند

> دليل عملي لمطوّر الفرونت إند عشان يربط تطبيق Next.js بـ Pregnancy Weeks API باستخدام Axios.

الريبو ده فيه الباك إند المبني بـ Express وMongoDB بس. الدليل الأساسي هنا بيشرح ربط تطبيق Next.js باستخدام Axios، والأمثلة ماشية حسب سلوك الـ API الحالي، بما في ده أسماء الحقول والقيود الموجودة.

## المحتويات

- [نظرة عامة على المشروع](#نظرة-عامة-على-المشروع)
- [تشغيل الباك إند](#تشغيل-الباك-إند)
- [ملخص سريع للـ API](#ملخص-سريع-للـ-api)
- [دليل Next.js مع Axios](#دليل-nextjs-مع-axios)
- [تسجيل الدخول والتحقق](#تسجيل-الدخول-والتحقق)
- [بيانات الأسابيع](#بيانات-الأسابيع)
- [ربط الفرونت إند](#ربط-الفرونت-إند)
- [أمثلة عامة إضافية للـ API client](#أمثلة-عامة-إضافية-للـ-api-client-اختيارية)
- [استخدام API client جوه الشاشة](#استخدام-api-client-جوه-الشاشة)
- [قيود الـ API الحالية](#قيود-الـ-api-الحالية)
- [اقتراح لتنظيم ملفات الفرونت إند](#اقتراح-لتنظيم-ملفات-الفرونت-إند)

## نظرة عامة على المشروع

| الجزء | التفاصيل |
| --- | --- |
| الباك إند | Node.js وExpress وMongoose |
| بداية مسارات الـ API | `/api/v1` |
| عنوان الـ API المحلي الافتراضي | `http://localhost:8080` |
| تسجيل الدخول والتحقق | JSON Web Token (JWT)، بيتبعت كـ Bearer token |
| البيانات | حسابات المستخدمين ومستندات أسابيع الحمل في MongoDB |

كود الباك إند متقسم لمجلدات [`controllers/`](./controllers/) و[`models/`](./models/) و[`routes/`](./routes/). الريبو لسه مافيهوش framework أو ملفات خاصة بالفرونت إند، ومفيهوش اختبارات للفرونت إند.

## تشغيل الباك إند

1. نزّل إصدار مناسب من Node.js واتأكد إن MongoDB شغالة ومتاحة.
2. من جوه مجلد `backend/`، نزّل الحزم المطلوبة:

   ```bash
   npm install
   ```

3. جهّز ملف `backend/.env` على جهازك بالقيم دي:

   ```dotenv
   DATABASE_URL=<your-mongodb-connection-string>
   JWT_SECRET=<a-long-random-secret>
   JWT_EXPIRES_IN=<jsonwebtoken-duration>
   PORT=8080
   ```

   قيمة `PORT` اختيارية؛ السيرفر بيستخدم `8080` لو ماحددتش غيره. ماتعملش commit لبيانات الدخول أو المفاتيح السرية الحقيقية.

4. شغّل سيرفر التطوير من مجلد `backend/`:

   ```bash
   npm run dev
   ```

السيرفر بيتصل بـ MongoDB قبل ما يبدأ يستقبل requests. لو الاتصال بالداتابيز فشل، السيرفر هيقف.

## ملخص سريع للـ API

كل المسارات اللي تحت دي بتبدأ من `http://localhost:8080/api/v1` في بيئة التطوير المحلية. أي request فيه body لازم يتبعت كـ JSON ومعاه `Content-Type: application/json`.

| الطريقة | المسار | محتاج تسجيل دخول؟ | الاستخدام |
| --- | --- | --- | --- |
| `POST` | `/signup` | لأ | إنشاء حساب |
| `POST` | `/login` | لأ | تسجيل الدخول واستلام JWT |
| `GET` | `/weeks` | لأ | جلب بيانات كل الأسابيع |
| `GET` | `/weeks/:weekNumber` | لأ | جلب بيانات أسبوع برقم الأسبوع |
| `PATCH` | `/weeks/:weekNumber` | مطلوب | تعديل بيانات أسبوع برقم الأسبوع |

## دليل Next.js مع Axios

الجزء ده هو مسار العمل المقترح لو هتعمل الواجهة باستخدام **Next.js App Router وAxios**. الأمثلة بتستخدم TypeScript؛ تقدر تشيل أنواع TypeScript لو مشروعك JavaScript. كل المسارات مبنية على الـ API الموجود حاليًا في الباك إند.

### 1. نزّل Axios في مشروع Next.js

نفّذ الأمر من مجلد مشروع Next.js، مش من مجلد الباك إند:

```bash
npm install axios
```

### 2. ظبّط عنوان الباك إند

أنشئ ملف `.env.local` في جذر مشروع Next.js:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```

شغّل أو أعد تشغيل Next.js بعد تعديل الملف. متغير `NEXT_PUBLIC_` بيتضمّن في كود الفرونت إند اللي بيوصل للمتصفح؛ ينفع تحط فيه عنوان الـ API بس، **ممنوع** تحط فيه `DATABASE_URL` أو `JWT_SECRET` أو أي مفتاح سري.

### 3. اعمل Axios client ودوال الـ API

أنشئ الملف `src/lib/api.ts`. الـ Axios instance هنا بتوحّد `baseURL` وإعدادات JSON. دوال الأسابيع بترجع `response.data` عشان مكونات الواجهة تتعامل مع البيانات مباشرة:

```ts
import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Week = {
  _id: string;
  weekNumber: string;
  babySize?: string;
  WhappenInBody?: string;
  sympotyms?: string;
  babyLooks?: string;
  option1?: string;
  option2?: string;
};

type AuthResponse = {
  message: string;
  token: string;
  user?: User;
};

export const authApi = {
  signUp: async (details: {
    name: string;
    email: string;
    password: string;
  }) => {
    const response = await api.post<AuthResponse>("/signup", details);
    return response.data;
  },

  logIn: async (credentials: { email: string; password: string }) => {
    const response = await api.post<AuthResponse>("/login", credentials);
    return response.data;
  },
};

export const weeksApi = {
  getAll: async (signal?: AbortSignal) => {
    const response = await api.get<Week[]>("/weeks", { signal });
    return response.data;
  },

  getByNumber: async (weekNumber: string, signal?: AbortSignal) => {
    const response = await api.get<Week | null>(
      `/weeks/${encodeURIComponent(weekNumber)}`,
      { signal },
    );
    return response.data;
  },

  update: async (
    weekNumber: string,
    changes: Partial<Omit<Week, "_id" | "weekNumber">>,
    token: string,
  ) => {
    const response = await api.patch<Week | null>(
      `/weeks/${encodeURIComponent(weekNumber)}`,
      changes,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  },
};
```

**خلي بالك:** `WhappenInBody` و`sympotyms` هما أسماء الحقول الموجودة حاليًا في الباك إند. استخدمهم زي ما هم في الـ requests والـ responses لحد ما يتغير عقد الـ API والداتا.

Axios بيحط الرد في `response.data`؛ عشان كده دوال `authApi` و`weeksApi` بترجع `response.data`. وأي رد HTTP مش من فئة 2xx بيرفض الـ promise، فاستقبل الخطأ بـ `try/catch` في الفورم أو المكون.

### 4. خزن حالة تسجيل الدخول في Client Provider

في Next.js App Router، أي كود بيستخدم React state أو أحداث تفاعلية لازم يكون Client Component. اعمل `src/app/providers.tsx` وخلي الـ JWT في الذاكرة:

```tsx
"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { authApi, type User } from "@/lib/api";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  signUp: (details: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logIn: (credentials: { email: string; password: string }) => Promise<void>;
  logOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  async function signUp(details: {
    name: string;
    email: string;
    password: string;
  }) {
    const result = await authApi.signUp(details);
    setToken(result.token);
    setUser(result.user ?? null);
  }

  async function logIn(credentials: { email: string; password: string }) {
    const result = await authApi.logIn(credentials);
    setToken(result.token);
    setUser(null);
  }

  function logOut() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, signUp, logIn, logOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth لازم يتستخدم جوه AuthProvider");
  }
  return context;
}
```

لفّ التطبيق بالـ provider من `src/app/layout.tsx`. الـ layout نفسه يفضل Server Component عادي؛ الـ provider هو Client Component:

```tsx
import type { ReactNode } from "react";
import { AuthProvider } from "./providers";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

في المثال ده، الـ token بيتخزن في الذاكرة وبيتمسح مع reload الصفحة. لو قررت تحفظه في browser storage عشان يفضل موجود بعد reload، خليك عارف إن JavaScript يقدر يقرأ التخزين ده؛ ماتخزنش فيه الباسورد أو أسرار السيرفر، واهتم بحماية التطبيق من XSS. مافيش endpoint لتسجيل الخروج أو لتجديد التوكن في الباك إند.

### 5. اعمل فورم تسجيل دخول

صفحات الفورم لازم تكون Client Components عشان تستخدم state وتستجيب لحدث submit. المثال ده مكانه `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "../providers";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (!error.response) {
      return "مش قادرين نوصل للسيرفر. راجع عنوان الـ API والاتصال.";
    }
    return `فشل الطلب (${error.response.status}). حاول تاني.`;
  }
  return error instanceof Error ? error.message : "حصل خطأ غير متوقع.";
}

export default function LoginPage() {
  const router = useRouter();
  const { logIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await logIn({ email, password });
      router.push("/weeks");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        الإيميل
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label>
        الباسورد
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
```

فورم إنشاء الحساب نفس الفكرة، بس استخدم `signUp({ name, email, password })`، وخلي الباسورد 8 حروف على الأقل عشان يطابق تحقق الباك إند.

### 6. اعرض الأسابيع باستخدام Axios في Next.js

الصفحة دي Client Component لأنها بتعمل request من المتصفح وبتستخدم state. حطها في `src/app/weeks/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { weeksApi, type Week } from "@/lib/api";

export default function WeeksPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    weeksApi
      .getAll(controller.signal)
      .then(setWeeks)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "مش قادرين نحمّل الأسابيع.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  if (loading) return <p role="status">جاري تحميل الأسابيع...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (weeks.length === 0) return <p>مفيش أسابيع متاحة حاليًا.</p>;

  return (
    <ul>
      {weeks.map((week) => (
        <li key={week._id}>
          <Link href={`/weeks/${encodeURIComponent(week.weekNumber)}`}>
            الأسبوع {week.weekNumber}: {week.babySize}
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

لو عايز صفحة تفاصيل أسبوع، نادِ `weeksApi.getByNumber(weekNumber, signal)`؛ خليك مستعد إن النتيجة تكون `null` لو الأسبوع مش موجود. وللتعديل، استخدم `weeksApi.update(weekNumber, changes, token)` من Client Component، وابعت token المستخدم الحالي. الـ GET متاح من غير تسجيل دخول، لكن PATCH محتاج Bearer token.

### إيه اللي يحصل لما request يفشل؟

- Axios بيرفض الـ promise مع ردود HTTP اللي مش 2xx؛ استخدم `try/catch` واعرض حالة الخطأ للمستخدم.
- لو `error.response` موجود، تقدر تقرأ HTTP status والـ body من `error.response.status` و`error.response.data`.
- لو `error.response` مش موجودة، غالبًا المشكلة اتصال أو CORS أو عنوان API غلط.
- ردود الأخطاء في الباك إند مش موحّدة، فماتعتمدش إن كل رد فيه `message`.
- لو فشل request محمي، امسح token من حالة تسجيل الدخول ووجّه المستخدم لصفحة الدخول حسب تدفق تطبيقك.

### ملاحظة عن Next.js وCORS

Next.js مش بيعدّي طلبات المتصفح للباك إند تلقائيًا. لو الفرونت إند شغال على origin مختلف عن `http://localhost:8080`، المتصفح هيحتاج إن الباك إند يسمح بـ origin بتاع Next.js عن طريق CORS، أو إنك تعمل proxy مضبوط. إعداد proxy لا يغيّر الـ API contract؛ استخدم المسارات `/api/v1/...` كما هي أو ظبّط إعادة التوجيه لتوصلها للباك إند.

كمان Next.js بيشغّل Server Components على السيرفر. الأمثلة هنا بتستخدم Axios من Client Components، عشان التوكن موجود في حالة تسجيل الدخول بالمتصفح. ماتستوردش Client Provider أو كود بيعتمد على `window` أو تخزين المتصفح داخل Server Component.

### إنشاء حساب

`POST /signup`

```json
{
  "name": "Alex",
  "email": "alex@example.com",
  "password": "at-least-8-characters"
}
```

لو العملية نجحت، الـ API بيرجع HTTP `201`:

```json
{
  "message": "اليوزر اتعمل بنجاح",
  "token": "<jwt>",
  "user": {
    "id": "<user-id>",
    "name": "Alex",
    "email": "alex@example.com"
  }
}
```

الإيميل بيتراجع وبيتحول لحروف صغيرة. الباسورد وقت إنشاء الحساب لازم يكون 8 حروف على الأقل. حقل `name` مطلوب في الداتابيز، لكن الـ API حاليًا مابيتأكدش من وجوده قبل ما يحاول ينشئ الحساب.

### تسجيل الدخول

`POST /login`

```json
{
  "email": "alex@example.com",
  "password": "at-least-1-character"
}
```

لو العملية نجحت، الـ API بيرجع HTTP `200`:

```json
{
  "message": "تسجيل الدخول تم بنجاح",
  "token": "<jwt>"
}
```

الرد بتاع تسجيل الدخول مابيرجعش بيانات المستخدم. لازم الإيميل يكون صحيح والباسورد مايكونش فاضي. بيانات الدخول الغلط بترفض، لكن الباك إند حاليًا مش بيرجع شكل JSON موحّد ومحدد لكل أنواع الأخطاء.

## تسجيل الدخول والتحقق

### خطوات تسجيل الدخول

خطوات تسجيل الدخول من الفرونت إند:

1. في إنشاء الحساب، خد اسم المستخدم والإيميل والباسورد؛ وفي تسجيل الدخول خد الإيميل والباسورد.
2. ابعت البيانات دي على `POST /signup` أو `POST /login`.
3. لو الطلب نجح، خزّن `token` اللي رجع في حالة تسجيل الدخول في الفرونت إند.
4. ابعت الـ token مع أي request لمسار محمي.
5. لما المستخدم يعمل تسجيل خروج، امسح الـ token من الفرونت إند. الباك إند مافيهوش endpoint لتسجيل الخروج، فده بيمسح التوكن من المتصفح بس.

إنشاء الحساب بيرجع token وكائن مستخدم فيه `id` و`name` و`email`. تسجيل الدخول بيرجع token ورسالة، لكن **مش بيرجع بيانات المستخدم**. مافيش endpoint يجيب بيانات المستخدم الحالي أو يجدّد الـ token. الباك إند حاليًا بيحمي `PATCH /weeks/:weekNumber` بس؛ إنشاء الحساب وتسجيل الدخول وقراءة الأسابيع متاحين من غير تسجيل دخول.

في تطبيقات المتصفح، الأفضل تخلي الـ token في الذاكرة طول ما ده مناسب. كده المستخدم هيتسجل خروجه لما يعمل reload للصفحة، إلا لو التطبيق بيحفظ الـ token بشكل مقصود. لو لازم يفضل مسجّل بعد reload، خليك واخد بالك من المخاطر الأمنية: كود JavaScript اللي شغال في الصفحة يقدر يوصل لـ `localStorage` و`sessionStorage`، وممكن يقرأهم لو في ثغرة XSS في التطبيق. ماتحفظش الباسورد أو أسرار السيرفر في تخزين المتصفح أبدًا. امسح الـ token وقت تسجيل الخروج، ولو اترفض أو انتهت صلاحيته رجّع المستخدم لشاشة تسجيل الدخول.

رد إنشاء الحساب ورد تسجيل الدخول فيهم JWT. احتفظ بيه للطلبات اللي محتاجة تسجيل دخول، وابعت الهيدر بالشكل القياسي:

```http
Authorization: Bearer <jwt>
```

مثال لتعديل بيانات أسبوع:

```http
PATCH /api/v1/weeks/12
Authorization: Bearer <jwt>
Content-Type: application/json
```

## بيانات الأسابيع

موديل Mongoose الحالي محدد فيه حقول الأسبوع دي:

| الحقل | نوع البيانات | ملاحظات |
| --- | --- | --- |
| `weekNumber` | String | بنستخدمه عشان نجيب بيانات الأسبوع من رقم الأسبوع في المسار |
| `babySize` | String | معلومات عن حجم البيبي |
| `WhappenInBody` | String | دي الكتابة الموجودة فعلًا في الباك إند؛ المقصود غالبًا «إيه اللي بيحصل في الجسم» |
| `sympotyms` | String | دي الكتابة الموجودة فعلًا في الباك إند؛ المقصود غالبًا «الأعراض» |
| `babyLooks` | String | معلومات عن شكل البيبي |
| `option1` | String | محتوى إضافي |
| `option2` | String | محتوى إضافي |

مستندات MongoDB ممكن يكون فيها كمان `_id` و`__v`. استخدم أسماء الحقول زي ما هي بالظبط في القراءة والإرسال لحد ما عقد الـ API يتغير.

### جلب كل الأسابيع

`GET /weeks` بيرجع قائمة فيها بيانات الأسابيع:

```json
[
  {
    "_id": "<document-id>",
    "weekNumber": "12",
    "babySize": "...",
    "WhappenInBody": "...",
    "sympotyms": "...",
    "babyLooks": "...",
    "option1": "...",
    "option2": "..."
  }
]
```

### جلب أسبوع واحد

`GET /weeks/:weekNumber` بيرجع بيانات الأسبوع المطابق للرقم. لو مافيش أسبوع بالرقم ده، الـ controller الحالي بيرجع `null` بدل ما يرجع status مخصص بمعنى «مش موجود».

### تعديل أسبوع

`PATCH /weeks/:weekNumber` بيستقبل كائن JSON فيه الحقول اللي عايز تعدلها. مثال:

```json
{
  "babySize": "Updated content"
}
```

المسار ده محتاج تسجيل دخول. السيرفر حاليًا بيبعت الـ body للداتابيز مباشرة من غير قائمة حقول مسموح بيها أو مراجعة لكل حقل؛ عشان كده الفرونت إند لازم يبعت بس الحقول اللي شاشة التعديل مفروض تغيّرها. لو مافيش أسبوع مطابق، الـ controller بيرجع `null`.

## ربط الفرونت إند

### خلّي عنوان الـ API قابل للتغيير

ماتكررش عنوان الباك إند في كذا component. استخدم طريقة حفظ متغيرات البيئة الخاصة بالـ framework بتاع الفرونت إند، وحدد عنوان أساسي واحد للـ API، زي المثال ده:

```text
http://localhost:8080/api/v1
```

وقت النشر، حط عنوان منفصل لبيئة production. ماتحطش بيانات دخول الداتابيز أو سر توقيع JWT في إعدادات الفرونت إند؛ أي قيمة بتوصل لكود المتصفح ممكن المستخدم يشوفها.

### اجمع الطلبات في مكان واحد وتعامل مع الأخطاء

استخدم helper واحد يظبط العنوان الأساسي وheaders الـ JSON والـ token لو موجود. مع `fetch` لازم تراجع `response.ok` قبل ما تعتبر الطلب ناجح؛ ده مثال بسيط:

```js
async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }

  return response.json();
}
```

لو الباك إند اعتمد بعد كده شكل JSON ثابت للأخطاء، عدّل طريقة قراءة الخطأ على أساسه. ماتعتبرش إن كل رد خطأ لازم يكون JSON.

### أمثلة عامة إضافية للـ API client (اختيارية)

القسم الأساسي اللي محتاجه مطوّر Next.js هو [دليل Next.js مع Axios](#دليل-nextjs-مع-axios) اللي فوق. الأمثلة هنا مرجع عام إضافي؛ مش محتاج تنفذ `fetch` وAxios مع بعض. خليك حاطط إعدادات العميل ودوال الـ API في module مشترك بدل ما تكررها في كل شاشة.

#### إعداد عنوان الـ API

في Next.js، حدد العنوان في ملف `.env.local` بتاع مشروع الفرونت إند:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```

Next.js بيعرض المتغيرات اللي بتبدأ بـ `NEXT_PUBLIC_` لكود المتصفح، عشان كده ماتحطش فيها أسرار. بعد ما تغيّر `.env.local` اعمل restart لسيرفر الفرونت إند. لو الفرونت إند والباك إند على نفس الـ origin، ممكن تستخدم عنوان API نسبي بشرط إن web server أو development proxy يوجّه `/api` للباك إند.

#### الاختيار الأول: `fetch` (موجود جاهز في المتصفحات)

`fetch` بيبعت HTTP request وبيرجع `Response`. هو **مش** بيرفض الـ promise لمجرد إن السيرفر رجّع HTTP error زي `400` أو `500`؛ لازم تراجع `response.ok` بنفسك. الـ helper اللي تحت بيقرأ الـ body كنص الأول عشان يتعامل مع JSON أو خطأ نصّي أو body فاضي، من غير ما يفترض إن كل الردود JSON.

```js
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

async function request(path, { token, body, headers, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? data.message
        : typeof data === "string" && data
          ? data
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}
```

دوال الـ endpoints اللي تحت بتدي الشاشات طريقة استخدام بسيطة وثابتة. ابعت object في `body` والـ helper هيحوّله لـ JSON. ابعت `token` بس مع الـ requests المحمية.

```js
export const authApi = {
  signUp: (details) =>
    request("/signup", { method: "POST", body: details }),
  logIn: (credentials) =>
    request("/login", { method: "POST", body: credentials }),
};

export const weeksApi = {
  getAll: ({ signal } = {}) =>
    request("/weeks", { method: "GET", signal }),
  getByNumber: (weekNumber, { signal } = {}) =>
    request(`/weeks/${encodeURIComponent(weekNumber)}`, {
      method: "GET",
      signal,
    }),
  update: (weekNumber, changes, token) =>
    request(`/weeks/${encodeURIComponent(weekNumber)}`, {
      method: "PATCH",
      body: changes,
      token,
    }),
};
```

`signal` اختياري، وبيخلّي الشاشة تلغي الطلب لو اتقفلت أو المستخدم راح لأسبوع تاني. إلغاء `fetch` وقت تنظيف الشاشة سلوك طبيعي؛ ماتعرضوش للمستخدم كأنه خطأ من السيرفر.

#### الاختيار التاني: Axios

Axios مكتبة اختيارية؛ نزّلها في **مشروع الفرونت إند** مش في package الباك إند:

```bash
npm install axios
```

اعمل instance واحدة من Axios وحدد فيها العنوان الأساسي وإعدادات JSON:

```js
import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

export const authApi = {
  signUp: async (details) => {
    const response = await api.post("/signup", details);
    return response.data;
  },
  logIn: async (credentials) => {
    const response = await api.post("/login", credentials);
    return response.data;
  },
};

export const weeksApi = {
  getAll: async (config = {}) => {
    const response = await api.get("/weeks", config);
    return response.data;
  },
  getByNumber: async (weekNumber, config = {}) => {
    const response = await api.get(
      `/weeks/${encodeURIComponent(weekNumber)}`,
      config,
    );
    return response.data;
  },
  update: async (weekNumber, changes, token) => {
    const response = await api.patch(
      `/weeks/${encodeURIComponent(weekNumber)}`,
      changes,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
  },
};
```

عكس `fetch`، Axios بيرفض الـ promise لو الرد مش من فئة 2xx. اعمل `catch` للأخطاء في الشاشة أو في مستوى التطبيق. لو `error.response` موجود، هتلاقي status في `error.response.status` والـ body في `error.response.data`؛ أخطاء الشبكة وCORS ممكن مايبقاش فيها `response` أصلًا. الـ API لسه مابيضمنش شكل موحّد للـ error body، فتعامل مع غياب `message` أو اختلاف قيمتها.

لو عندك أكتر من request محمي محتاج نفس الـ token، ممكن Axios request interceptor يضيفه تلقائيًا. اقرأه من حالة تسجيل الدخول وقت إرسال الطلب؛ ماتكتبوش ثابت جوه إعدادات الـ client:

```js
api.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

استخدم interceptor بس لو الفرونت إند عنده `authStore` أو حاجة مشابهة تقدر تجيب الـ token الحالي بشكل آمن. غير كده، تمرير الـ token صراحةً لدالة الـ endpoint المحمي بيخلّي الاعتماد واضح.

### خطوات تسجيل الدخول كاملة باستخدام Axios

المثال ده React عام. لو مشروعك Next.js، استخدم الـ provider الموجود في [دليل Next.js مع Axios](#دليل-nextjs-مع-axios) لأنه متجهز مع App Router. المثال العام بيحتفظ بالـ JWT في الذاكرة وبيوفر وظائف إنشاء الحساب وتسجيل الدخول والخروج لباقي التطبيق.

```jsx
import { createContext, useContext, useState } from "react";
import { authApi } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  async function signUp({ name, email, password }) {
    const result = await authApi.signUp({ name, email, password });
    setToken(result.token);
    setUser(result.user);
    return result;
  }

  async function logIn({ email, password }) {
    const result = await authApi.logIn({ email, password });
    setToken(result.token);
    setUser(null);
    return result;
  }

  function logOut() {
    setToken(null);
    setUser(null);
  }

  const value = { token, user, isAuthenticated: Boolean(token), signUp, logIn, logOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return auth;
}
```

في تطبيق React عادي لفّ التطبيق كله (أو المسارات اللي محتاجة تسجيل دخول) بالـ provider. في Next.js استخدم ملف `layout.tsx` زي المثال الموجود فوق بدل `root.render`:

```jsx
import { AuthProvider } from "./auth/AuthContext";

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
```

فورم إنشاء الحساب أو تسجيل الدخول المفروض تنادي وظيفة الـ context من submit handler. المثال بيفترض إن الفورم مجهّز `email` و`password` و`navigate` وReact state hooks؛ عطّل زر الإرسال طول ما الطلب شغال، واعرض رسالة واضحة لو الـ promise اترفضت:

```jsx
const { logIn } = useAuth();
const [error, setError] = useState("");
const [submitting, setSubmitting] = useState(false);

async function handleSubmit(event) {
  event.preventDefault();
  setError("");
  setSubmitting(true);

  try {
    await logIn({ email, password });
    navigate("/");
  } catch (requestError) {
    setError(getApiErrorMessage(requestError));
  } finally {
    setSubmitting(false);
  }
}
```

بما إن تسجيل الدخول مابيرجعش بيانات المستخدم، قيمة `user` هتكون `null` بعده في المثال ده. استخدم الـ token للسماح بالطلبات المحمية؛ ماتحاولش تستنتج بيانات المستخدم منه. إنشاء الحساب بيرجع كائن المستخدم.

باستخدام Axios ودوال الـ endpoints اللي فوق، تقدر تبعت الـ token الحالي من auth context مع طلب تعديل محمي:

```jsx
const { token, isAuthenticated } = useAuth();

async function saveWeek(weekNumber, changes) {
  if (!isAuthenticated) {
    throw new Error("لازم تسجل دخول عشان تعدّل بيانات أسابيع الحمل.");
  }

  return weeksApi.update(weekNumber, changes, token);
}
```

دالة `weeksApi.update` بتضيف Bearer authorization header للطلب. خزن الـ token في مكان واحد (زي context أو state store)؛ ماتكرروش في كل component وماتكتبوش ثابت في Axios instance. لو هتستخدم interceptor بدل كده، خليه يقرأ من نفس حالة تسجيل الدخول وماتبعتش الـ token كوسيط للدالة عشان مايبقاش عندك مصدرين مختلفين.

Axios بيرفض الطلبات اللي ردها مش 2xx. الـ helper ده بيعرض رسالة الـ API لو موجودة، وإلا بيستخدم رسالة بديلة آمنة:

```js
import axios from "axios";

export function getApiErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && typeof data.message === "string") {
      return data.message;
    }
    if (!error.response) {
      return "مش قادرين نوصل للسيرفر. راجع اتصالك بالإنترنت وحاول تاني.";
    }
    return `الطلب فشل (${error.response.status}). حاول تاني.`;
  }

  return error instanceof Error ? error.message : "حصلت مشكلة غير متوقعة.";
}
```

الباك إند حاليًا مش موحّد شكل ردود الأخطاء، فممكن `message` ماتكونش موجودة أو يكون الرد متولد من framework. ماتعرضش تفاصيل السيرفر الداخلية للمستخدم. لو فشل التحقق من المستخدم في مسار محمي، امسح الجلسة اللي في الذاكرة وودّي المستخدم لتسجيل الدخول؛ وباقي أخطاء الطلبات اعرضها في الشاشة المناسبة بدل ما تتعامل معاها كأنها نجحت.

### استخدام API client جوه الشاشة

ده مثال React بيحمّل قائمة الأسابيع ويعرضها باستخدام `weeksApi` المعتمد على `fetch` اللي فوق. المثال بيفرق بين حالات التحميل والفشل والقائمة الفاضية والنجاح، وكمان بيلغي الطلب اللي لسه شغال لو الشاشة اتقفلت:

```jsx
import { useEffect, useState } from "react";
import { weeksApi } from "./api";

export function WeeksList() {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    weeksApi
      .getAll({ signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("البيانات اللي رجعت من السيرفر مش قائمة أسابيع.");
        }
        setWeeks(data);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || "مش قادرين نحمّل بيانات أسابيع الحمل.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  if (loading) return <p role="status">جاري تحميل أسابيع الحمل…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (weeks.length === 0) return <p>مفيش بيانات لأسابيع الحمل لسه.</p>;

  return (
    <ul>
      {weeks.map((week) => (
        <li key={week._id}>
          <a href={`/weeks/${encodeURIComponent(week.weekNumber)}`}>
            الأسبوع {week.weekNumber}: {week.babySize}
          </a>
        </li>
      ))}
    </ul>
  );
}
```

لو بتستخدم Axios، نادِ `weeksApi.getAll()` بنفس طريقة تدفق الشاشة، وتعامل مع الـ promise المرفوضة في `catch`. لو محتاج تلغي الطلب، ابعت `AbortController` signal ضمن إعدادات Axios.

### سجّل الدخول وابعت request لمسار محمي

نادِ دالة تسجيل الدخول ببيانات الفورم. الرد فيه token؛ خليه في حالة تسجيل الدخول بالتطبيق وابعته لـ `weeksApi.update`:

```js
const result = await authApi.logIn({ email, password });
setToken(result.token);

const updatedWeek = await weeksApi.update(
  "12",
  { babySize: "Updated content" },
  result.token,
);
```

في التطبيق الحقيقي، خزن الـ token في auth context أو store بدل متغير محلي بيختفي بعد ما دالة تسجيل الدخول تخلص. امسحه لما المستخدم يسجل خروج. مافيش endpoint لتسجيل الخروج أو لتجديد الـ token في الباك إند. لو الفرونت إند بيحفظ الـ token بعد reload، افتكر إن تخزين المتصفح المتاح لـ JavaScript ممكن يتسرّب لو الصفحة فيها ثغرة XSS؛ ماتخزنش باسوردات أو أسرار السيرفر في الفرونت إند أبدًا.

### التعامل مع الفورم والتحميل والأخطاء

- عطّل زر الإرسال طول ما الطلب شغال عشان تقلل فرص إرسال نفس الطلب أكتر من مرة بالغلط.
- راجع الحقول في الواجهة عشان تساعد المستخدم، بس خلي التحقق النهائي مسؤولية السيرفر.
- اعرض رسالة واضحة بالنجاح أو الخطأ؛ ماتسيبش الفورم يبان كأنه اتحفظ لو الطلب فشل.
- في إنشاء الحساب، اشترط إيميل صحيح وباسورد 8 حروف على الأقل عشان يطابق تحقق الباك إند الحالي. في تسجيل الدخول، الباسورد لازم يكون مش فاضي بس حسب التحقق الحالي.
- مع `GET /weeks/:weekNumber` و`PATCH /weeks/:weekNumber`، راجع لو النتيجة `null` واعرض حالة إن الأسبوع مش موجود. الباك إند حاليًا مابيرجعش `404` مخصص للأسبوع اللي مش موجود.
- ماتعتبرش إن أخطاء تسجيل الدخول أو تكرار الإيميل أو أخطاء السيرفر كلها بترجع نفس شكل JSON. لو الرد مافيهوش رسالة مفهومة، اعرض رسالة بديلة وآمنة.

### ترتيب خطوات الاستخدام الأساسية

1. **عرض الأسابيع:** اطلب `/weeks`، واعرض حالات التحميل والقائمة الفاضية والخطأ، وبعدها اعرض البيانات اللي رجعت.
2. **فتح أسبوع:** اطلب `/weeks/:weekNumber` وخد بالك إن النتيجة ممكن تكون `null` لو الأسبوع مش موجود.
3. **إنشاء حساب أو تسجيل الدخول:** ابعت بيانات JSON المناسبة، واعرض أخطاء التحقق أو تسجيل الدخول، واحفظ JWT حسب سياسة تخزين التوكن في التطبيق.
4. **تعديل أسبوع:** ابعت الحقول المطلوبة بس باستخدام `PATCH` وأرفق الـ token، وبعدها حدّث الواجهة بالبيانات اللي رجعت.
5. **التعامل مع انتهاء الجلسة:** لو request محتاج تسجيل دخول وفشل، وضّح للمستخدم إيه اللي حصل وخليه يقدر يسجل دخول تاني.

### طلبات المتصفح بين origins مختلفة (CORS)

تطبيق Express حاليًا مش مفعّل فيه إعداد CORS. لو الفرونت إند شغال على origin مختلف (حتى لو الاختلاف في رقم port بتاع localhost)، المتصفح ممكن يمنع الـ requests. استخدم development proxy على نفس الـ origin، أو ظبّط الباك إند عشان يسمح للـ origin بتاع الفرونت إند قبل ما تعتمد على requests مباشرة بين origins مختلفة. ماتحاولش تحل المشكلة بتعطيل حماية المتصفح.

## قيود الـ API الحالية

خلي السلوكيات دي في بالك وإنت بتنفّذ الواجهة:

- مافيش endpoint لبيانات المستخدم أو «المستخدم الحالي»، ولا endpoint لتجديد الـ token أو تسجيل الخروج.
- ردود الأخطاء مش موحّدة بين المسارات؛ بعض الأخطاء ممكن ترجع الرد الافتراضي بتاع Express بدل body بصيغة JSON زي `{ "message": "..." }`.
- قراءة الأسبوع وتعديله بيرجعوا `null` لو المستند مش موجود، بدل status `404` مخصص.
- الباك إند مابيراجعش body بتاع تعديل الأسبوع ومابيقيّدش الحقول المسموح بتعديلها.
- الـ schema فيها أسماء حقول مكتوبة غلط (`WhappenInBody` و`sympotyms`)؛ تغييرها محتاج تحديث متوافق للباك إند والداتا.
- CORS مش مفعّل في تطبيق Express.

اتعامل مع النقط دي على إنها مسؤولية الباك إند وعقد الـ API، وماتبنيش افتراضات من عندك في الفرونت إند. لو الـ API اتغير، حدّث الدليل ده واتفاق الفرونت إند والباك إند مع بعض.

## اقتراح لتنظيم ملفات الفرونت إند

عدّل التنظيم ده حسب الـ framework اللي هتستخدمه؛ دي اقتراحات لتقسيم المسؤوليات مش أسماء ملفات لازم تلتزم بيها:

```text
src/
  lib/          # Axios client ودوال الـ endpoints
  components/   # عناصر واجهة مشتركة زي الفورم وحالات التحميل والأخطاء
  features/
    auth/       # شاشات وحالة إنشاء الحساب وتسجيل الدخول
    weeks/      # عرض الأسابيع وتفاصيلها وتعديلها
  types/        # أنواع مشتركة لطلبات وردود الـ API
  app/          # صفحات Next.js وlayout.tsx وproviders.tsx
```

على قد ما تقدر، خلي استدعاءات الـ API برّه components العرض. عرّف أنواع بيانات الـ API بنفس أسماء الحقول اللي بترجع من السيرفر، واعرض labels واضحة وحالات ظاهرة للتحميل والتحقق وفشل الطلبات.
