# Femora Backend → Frontend Guide

دليل عملي لربط الـ Frontend بالـ Backend، يشرح الـ flow والـ business logic، ومعاني المصطلحات الإنجليزية المهمة، وأمثلة كود نظيفة عليها تعليقات عند النقاط التي تحتاج توضيحًا فقط. الأمثلة مناسبة لـ **Next.js + React + TypeScript + Axios**.

> **مهم:** عنوان الـ API والمسارات وأسماء الحقول هنا مبنية على عقد الـ API الموثق في الدليل. لو عدّلت الـ backend، راجع الـ routes والـ controllers والـ models، لأن الـ response الحقيقي من الكود هو المرجع النهائي. لا تفترض وجود endpoint غير موجود.

---

## 1. الفكرة من أولها: إيه اللي بيحصل لما المستخدم يضغط زر؟

مثال: المستخدم بيعمل تسجيل دخول.

1. يكتب الإيميل والباسورد في inputs.
2. React يحتفظ بالقيم في `state`.
3. عند الضغط على الزر، `handleSubmit` تمنع إعادة تحميل الصفحة.
4. الدالة تستدعي `authApi.login()`، وهي دالة مسؤولة عن إرسال الطلب.
5. Axios يرسل `POST /login` ومعاه JSON فيه الإيميل والباسورد.
6. الباك إند يستقبل الطلب، يتحقق من البيانات، ويبحث عن المستخدم ويتحقق من كلمة المرور.
7. لو البيانات صحيحة، الباك إند ينشئ JWT ويرجعه في الـ response.
8. الفرونت يحفظ الـ token، ثم يوجّه المستخدم للـ dashboard.
9. بعد كده، أي request محمي يمر على Axios interceptor، فيضيف التوكن داخل `Authorization`.
10. الباك إند يتحقق من التوكن قبل تنفيذ الـ controller المحمي.

**تقسيم المسؤوليات:** الفرونت يجمع البيانات ويعرض النتائج، لكن الباك إند هو المسؤول عن صحة البيانات، هوية المستخدم، الصلاحيات، وقاعدة البيانات.

### مصطلحات لازم تفهمها

- `Endpoint`: عنوان عملية معينة مثل `/login`.
- `HTTP method`: نوع العملية؛ `GET` للقراءة، `POST` للإرسال/الإنشاء، `PATCH` للتعديل الجزئي.
- `Request body`: البيانات التي يرسلها الفرونت، غالبًا JSON.
- `Headers`: معلومات إضافية مع الطلب مثل `Content-Type` و`Authorization`.
- `Response`: الرد الذي يرجع من السيرفر.
- `Status code`: رقم يوضح نتيجة الطلب، مثل `200` أو `401`.
- `JWT`: token يثبت هوية المستخدم للطلبات المحمية؛ وجوده وحده لا يعني أنه صالح، فالـ backend يتحقق منه.
- `Axios`: مكتبة ترسل HTTP requests وتسهّل قراءة الـ response والتعامل مع الأخطاء.
- `API client`: ملف/instance مشتركة مسؤولة عن إعدادات الاتصال، بدل تكرارها في كل صفحة.
- `Interceptor`: خطوة وسيطة تعمل تلقائيًا قبل إرسال request أو بعد استلام response.
- `Controller`: جزء في الباك إند ينفّذ منطق الـ endpoint بعد الـ middleware.
- `Middleware`: طبقة تمر عليها الـ request قبل الـ controller، مثل التحقق من JWT.
- `State`: بيانات مؤقتة تحتفظ بها واجهة React، مثل قيم الفورم أو بيانات الأسبوع المعروضة.
- `Business logic`: قواعد التطبيق نفسها، مثل تحديد المستخدم صاحب سجل الحمل وحساب موعد الولادة.

الفكرة في الأمثلة: الكود يوضح **الخطوات المهمة**، أما تفاصيل TypeScript وReact التي لا تغيّر اللوجيك فمش محتاجة تعليق على كل سطر.

---

## 2. عنوان السيرفر والمسارات المتاحة

عنوان الإنتاج:

```text
https://femora-backend-v3hw.onrender.com/api/v1
```

عنوان التطوير المحلي مثالًا، بشرط أن الباك إند يعمل فعلًا على هذا البورت:

```text
http://localhost:8080/api/v1
```

أنشئ ملف `.env.local` في جذر مشروع Next.js:

```env
# عنوان الـ API الأساسي؛ متغير NEXT_PUBLIC مسموح لأنه ليس سرًا.
NEXT_PUBLIC_API_BASE_URL=https://femora-backend-v3hw.onrender.com/api/v1
```

بعد تغيير `.env.local` أعد تشغيل dev server. لا تضع `JWT_SECRET` أو بيانات قاعدة البيانات في متغير يبدأ بـ `NEXT_PUBLIC_`؛ لأن قيمته ممكن تظهر في كود المتصفح.

### خريطة المسارات

كل المسارات دي مسبوقة بـ `/api/v1`:

| Method | Endpoint | محتاج JWT؟ | وظيفته |
|---|---|---:|---|
| `POST` | `/signup` | لا | إنشاء حساب |
| `POST` | `/login` | لا | تسجيل الدخول |
| `GET` | `/weeks` | لا | جلب كل الأسابيع |
| `GET` | `/weeks/:weekNumber` | لا | جلب أسبوع محدد |
| `PATCH` | `/weeks/:weekNumber` | نعم، admin | تعديل بيانات أسبوع |
| `POST` | `/create-pregnancy` | نعم | تسجيل حمل |
| `GET` | `/get-pregnancy` | نعم | جلب حمل المستخدم |
| `PATCH` | `/update-pregnancy` | نعم | تحديث تاريخ آخر دورة |

`/weeks/:weekNumber` فيه جزء متغير. لما تطلب الأسبوع 12، الرابط الفعلي يكون `/weeks/12` وليس `/weeks/:weekNumber`.

لا يوجد في المسارات المذكورة endpoint لـ `/logout` أو `/refresh-token` أو `/me` أو CRUD للأطفال. لا تنشئ calls للمسارات دي إلا لو أضفتها للباك إند.

---

## 3. تثبيت Axios وبناء API client مشترك

نفّذ:

```bash
npm install axios # تثبيت Axios داخل مشروع الفرونت إند
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
    if (!error.response) return "تعذر الاتصال بالسيرفر. راجع الإنترنت وعنوان API وCORS.";
    return `حصل خطأ من السيرفر (HTTP ${error.response.status}).`;
  }

  return error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
}
```

### إيه فايدة `api`؟

بدل ما تكتب الرابط الكامل في كل مكان:

```ts
const response = await axios.get("https://femora-backend-v3hw.onrender.com/api/v1/weeks");
```

اكتب:

```ts
const response = await api.get("/weeks");
```

لو عنوان السيرفر اتغير، تغيّر `.env.local` فقط.

### الـ interceptor بيعمل إيه بالضبط؟

قبل كل request، يقرأ `femora_token` من `localStorage`. لو موجود، يضيف الهيدر بالشكل التالي:

```http
Authorization: Bearer eyJhbGciOi...
```

لو مفيش token، الطلب يخرج من غير الهيدر. ده طبيعي في `/signup` و`/login` و`/weeks`، لكن endpoints الحمل هترفضه لو محتاجة JWT. الـ interceptor لا يتحقق من صلاحية التوكن؛ ده دور الباك إند.

### ليه `getApiError` مهمة؟

Axios عادةً يرمي error لو status code مش نجاح. `getApiError` بتحاول تقرأ رسالة السيرفر بدل ما تعرض للمستخدم رسالة تقنية طويلة. لو مفيش response، ممكن يكون فيه مشكلة اتصال أو CORS أو عنوان غلط.

---

## 4. Authentication: إنشاء حساب وتسجيل دخول

### 4.1 التسجيل `POST /signup`

الفرونت يرسل body بالشكل ده:

```json
{
  "name": "Sara",
  "email": "sara@example.com",
  "password": "password123"
}
```

اللوجيك المتوقع في الباك إند:

1. يستقبل الحقول.
2. يتحقق من الحقول وصيغة الإيميل وطول كلمة المرور.
3. يتأكد إن الإيميل مش مستخدم قبل كده.
4. يحفظ المستخدم، وكلمة المرور المفروض تتحفظ كـ hash مش كنص مكشوف.
5. يرجع رسالة نجاح وJWT وبيانات المستخدم حسب response الخاص بالـ controller.

مثال response توضيحي:

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

شكل الرد والنصوص والـ status code لازم تتطابق مع الباك إند الفعلي؛ المثال للتوضيح.

### 4.2 تسجيل الدخول `POST /login`

Body:

```json
{
  "email": "sara@example.com",
  "password": "password123"
}
```

الـ backend يبحث عن الحساب ويتحقق من كلمة المرور. لو صحيحة يرجع token؛ لو غلط يرجع error. حسب عقد الـ API الحالي في هذا الدليل، `/login` يرجع `message` و`token`، ولا تعتمد على `data.user` إلا لو الـ backend رجّعها فعلًا.

### 4.3 ملف خدمة المصادقة `src/lib/auth-api.ts`

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
    return data;
  },

  logout() {
    localStorage.removeItem("femora_token");
    localStorage.removeItem("femora_user");
  },

  getToken() {
    return typeof window === "undefined" ? null : localStorage.getItem("femora_token");
  },
};
```

### 4.4 مثال صفحة login كاملة

احفظه في `src/app/login/page.tsx` لو مشروعك Next.js App Router. لو مشروعك React Router، غيّر طريقة التنقل فقط.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/auth-api";
import { getApiError } from "@/lib/api";

export default function LoginPage() {
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
      <label>البريد الإلكتروني
        <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label>كلمة المرور
        <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>{loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}</button>
    </form>
  );
}
```

**ملاحظة:** التعليقات داخل JSX مكتوبة بصيغة ``، وهي صيغة صالحة في TSX.

### 4.5 التسجيل من component

بعد تجهيز state باسم `name` و`email` و`password`، استخدم هذا داخل `try` في submit handler:

```ts
const result = await authApi.signUp({ name, email, password });
setMessage(result.message);
router.replace("/dashboard");
```

لازم يكون حوله `try/catch/finally` مثل login، حتى تعرض الخطأ وتوقف spinner لو فشل الطلب.

### 4.6 تسجيل الخروج

```tsx
"use client";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/auth-api";

export function LogoutButton() {
  const router = useRouter();
  function handleLogout() {
    authApi.logout();
    router.replace("/login");
  }
  return <button onClick={handleLogout}>تسجيل الخروج</button>;
}
```

الخروج هنا محلي فقط؛ طالما الـ backend لا يوفر endpoint logout أو token blacklist، حذف التوكن من المتصفح لا يلغي التوكن من جهة السيرفر لو كان شخص قد نسخه مسبقًا.

### ملاحظة أمنية عن `localStorage`

`localStorage` سهل، لكنه قابل للقراءة من JavaScript داخل الصفحة؛ لذلك أي ثغرة XSS قد تعرض التوكن للخطر. لا تحفظ كلمة المرور. لو أردت حماية أقوى، ناقش مع backend استخدام HttpOnly Secure cookies مع CSRF/CORS مضبوطين، لأن تغيير طريقة التخزين يتطلب دعمًا من السيرفر.

---

## 5. كيف يستخدم JWT في الطلبات المحمية؟

بعد تسجيل الدخول، التوكن موجود تحت المفتاح `femora_token`. عند استدعاء:

```ts
const result = await pregnancyApi.getAll();
```

المسار المنطقي:

1. `pregnancyApi.getAll()` ينادي `api.get`.
2. request interceptor يقرأ التوكن.
3. Axios يرسل `GET /get-pregnancy` ومعه `Authorization: Bearer <token>`.
4. middleware في backend يتحقق من التوكن ويحدد هوية المستخدم.
5. لو التوكن غير صالح، يتوقف الطلب ويرجع غالبًا `401`.
6. لو صالح، controller ينفذ المنطق ويرجع بيانات الحمل الخاصة بالمستخدم.
7. الفرونت يضع البيانات في state ويعرضها.

لا ترسل التوكن في query string أو URL. ولا تثق في user ID قادم من input لتحديد مالك سجل الحمل؛ الباك إند يجب أن يعتمد على الهوية المستخرجة من JWT.

---

## 6. Pregnancy API: إنشاء الحمل وقراءته وتحديثه

### 6.1 شكل البيانات

- `lastPeriodDate`: أول يوم في آخر دورة شهرية.
- `dueDate`: موعد الولادة المتوقع.
- `currentWeek`: أسبوع الحمل المحسوب.
- `currentDay`: اليوم داخل الأسبوع حسب طريقة الحساب في الباك إند.
- `_id`: معرّف سجل الحمل في قاعدة البيانات.
- `user`: المستخدم المرتبط بسجل الحمل.

الـ backend يحسب موعد الولادة من تاريخ آخر دورة بإضافة 280 يومًا حسب المنطق الحالي. الأفضل أن تعرض القيم المحسوبة التي رجعت من السيرفر، بدل أن تحسبها بطريقة مختلفة في الفرونت.

### 6.2 خدمة `src/lib/pregnancy-api.ts`

```ts
import { api } from "./api";

export type Pregnancy = {
  _id: string;
  user: string;
  lastPeriodDate: string;
  dueDate: string;
  currentWeek: number;
  currentDay: number;
};

export const pregnancyApi = {
  async create(lastPeriodDate: string) {
    const { data } = await api.post<{ message: string; pregnancy: Pregnancy }>(
      "/create-pregnancy",
      { lastPeriodDate }
    );
    return data;
  },

  async getAll() {
    const { data } = await api.get<{ message: string; pregnancies: Pregnancy[] }>(
      "/get-pregnancy"
    );
    return data;
  },

  async update(lastPeriodDate: string) {
    const { data } = await api.patch<{ message: string; pregnancy: Pregnancy }>(
      "/update-pregnancy",
      { lastPeriodDate }
    );
    return data;
  },
};
```

`<Pregnancy>` في `api.post<Type>` يساعد TypeScript على معرفة شكل البيانات أثناء التطوير، لكنه لا يتحقق من response في وقت التشغيل. إذا رجع السيرفر شكلًا مختلفًا، راجع الـ controller وعدّل النوع.

### 6.3 إنشاء سجل حمل `POST /create-pregnancy`

Request:

```http
POST /api/v1/create-pregnancy
Authorization: Bearer <JWT>
Content-Type: application/json
```

Body:

```json
{
  "lastPeriodDate": "2026-07-01"
}
```

اللي بيحصل في الباك إند عادةً حسب الـ controller الحالي:

1. middleware يتحقق من JWT قبل الوصول للـ controller.
2. controller يقرأ `lastPeriodDate` من body.
3. يتحقق أن التاريخ موجود وصالح وليس في المستقبل.
4. يحدد المستخدم من بيانات التوكن، وليس من `userId` يرسله الفرونت.
5. يحسب `dueDate` والحقول التابعة للحمل.
6. ينشئ سجلًا في قاعدة البيانات.
7. يرجع رسالة النجاح والسجل المنشأ.

Response توضيحي:

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

الأرقام والتاريخ في المثال للتوضيح فقط؛ النتيجة الفعلية تعتمد على تاريخ التنفيذ وحسابات الباك إند.

### 6.4 جلب الحمل `GET /get-pregnancy`

لا يحتاج body، لكنه يحتاج JWT. الباك إند يقرأ هوية المستخدم من التوكن ثم يبحث عن سجل/سجلات هذا المستخدم فقط.

Response توضيحي:

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

إذا لم يوجد سجل، الـ API الحالي قد يرجع `404` برسالة بدل ما يرجع `200` مع array فارغة. تعامل مع ذلك في `catch` حسب العقد الفعلي، ولا تفترض أن النتيجة دائمًا `[]`.

### 6.5 تحديث الحمل `PATCH /update-pregnancy`

Body:

```json
{
  "lastPeriodDate": "2026-07-05"
}
```

الـ backend يحدد حمل المستخدم، يتحقق من التاريخ، ويحدث السجل ويعيد حساب `dueDate` و`currentWeek` و`currentDay`. لا ترسل القيم المحسوبة يدويًا من الفرونت؛ أرسل المصدر الذي يعتمد عليه الحساب فقط.

### 6.6 مثال component لحفظ الحمل

```tsx
"use client";

import { useState } from "react";
import { pregnancyApi } from "@/lib/pregnancy-api";
import { getApiError } from "@/lib/api";

export function PregnancyForm() {
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!lastPeriodDate) { setError("اختار تاريخ آخر دورة أولًا."); return; }
    setLoading(true);
    try {
      const result = await pregnancyApi.create(lastPeriodDate);
      setMessage(result.message);
      setDueDate(result.pregnancy.dueDate);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>أول يوم في آخر دورة
        <input type="date" value={lastPeriodDate} onChange={(event) => setLastPeriodDate(event.target.value)} required />
      </label>
      <button type="submit" disabled={loading}>{loading ? "جاري الحفظ..." : "حفظ بيانات الحمل"}</button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {dueDate && <p>موعد الولادة المتوقع: {new Date(dueDate).toLocaleDateString("ar-EG")}</p>}
    </form>
  );
}
```

التعليقات داخل JSX تستخدم الصيغة ``، لذلك تظل الأمثلة صالحة للنسخ داخل ملفات TSX.

---

## 7. Weeks API: جلب الأسابيع وعرضها

### 7.1 أسماء الحقول

الحقول المذكورة في الموديل الحالي تتضمن:

- `weekNumber`: رقم الأسبوع.
- `babySize`: وصف حجم الجنين.
- `WhappenInBody`: معلومات ما يحدث في جسم الأم؛ الاسم كما هو في الـ API.
- `sympotyms`: الأعراض؛ الاسم كما هو في الـ API.
- `babyLooks`: وصف شكل الجنين.
- `option1` و`option2`: حقول إضافية حسب المحتوى.

**لا تصلح تهجئة `WhappenInBody` أو `sympotyms` في الفرونت وحده**؛ الـ key لازم يطابق JSON الذي يرجع من السيرفر حرفيًا.

### 7.2 ملف `src/lib/weeks-api.ts`

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
};

export const weeksApi = {
  async getAll() {
    const { data } = await api.get<PregnancyWeek[]>("/weeks");
    return data;
  },

  async getByNumber(weekNumber: string | number) {
    const path = `/weeks/${encodeURIComponent(String(weekNumber))}`;
    const { data } = await api.get<PregnancyWeek>(path);
    return data;
  },

  async update(weekNumber: string | number, changes: Partial<PregnancyWeek>) {
    const path = `/weeks/${encodeURIComponent(String(weekNumber))}`;
    const { data } = await api.patch(path, changes);
    return data;
  },
};
```

### 7.3 جلب وعرض كل الأسابيع

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
    weeksApi.getAll()
      .then((data) => { if (active) setWeeks(data); })
      .catch((err) => { if (active) setError(getApiError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <p>جاري تحميل الأسابيع...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (weeks.length === 0) return <p>لا توجد أسابيع متاحة.</p>;

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

التعليقات داخل JSX في المثال مكتوبة بصيغة `` حتى لا تسبب أخطاء syntax.

### 7.4 جلب أسبوع محدد

```ts
const week = await weeksApi.getByNumber(12);
setSelectedWeek(week);
```

إذا رجع backend `404`، Axios يدخل `catch`. اعرض رسالة «الأسبوع غير موجود» بدل ما تتعامل مع الخطأ كأنه بيانات صحيحة.

### 7.5 تعديل أسبوع — Admin فقط

```ts
const updatedWeek = await weeksApi.update(12, { babySize: "حجم محدث" });
```

المسار محمي ويحتاج مستخدمًا بصلاحية admin. إخفاء زر التعديل في الواجهة ليس حماية؛ يمكن لأي شخص إرسال request يدويًا. لازم backend يتحقق من الدور ويرفض المستخدم غير المصرح له.

---

## 8. فهم الـ response والـ status codes

Axios response عادةً يحتوي على:

- `response.data`: الـ JSON body الذي رجع من السيرفر.
- `response.status`: status code مثل `200` أو `201`.
- `response.headers`: headers القادمة من السيرفر.

لذلك:

```ts
const response = await api.get("/weeks");
console.log(response.status);
console.log(response.data);
```

أما عند كتابة:

```ts
const { data } = await api.get("/weeks");
```

فأنت تختصر الوصول للبيانات لأنك غالبًا تحتاج `data` فقط.

### Status codes الشائعة

| Code | معناها | تتعامل معها إزاي؟ |
|---|---|---|
| `200` | الطلب نجح | اعرض البيانات أو حدّث الواجهة |
| `201` | تم إنشاء سجل | اعرض النجاح أو انتقل للخطوة التالية |
| `400` | البيانات غير سليمة | اعرض رسالة التحقق القادمة من السيرفر |
| `401` | التوكن مفقود/غير صالح أو بيانات الدخول غير صحيحة | اطلب تسجيل الدخول عند الحاجة |
| `403` | المستخدم لا يملك الصلاحية | وضّح أن العملية غير مسموحة |
| `404` | المسار أو السجل غير موجود | اعرض حالة عدم وجود |
| `409` | تعارض، مثل إيميل مكرر إذا كان السيرفر يستخدم هذا الكود | اعرض رسالة مناسبة |
| `500` | خطأ داخلي في السيرفر | رسالة عامة وجرّب لاحقًا |

الـ status الدقيق يعتمد على controller؛ الجدول شرح شائع وليس وعدًا بأن كل endpoint يرجع نفس الكود.

### الفرق بين HTTP error وnetwork error

- لو `error.response` موجودة: وصل رد من السيرفر وفيه status code.
- لو `error.response` غير موجودة: لم يصل رد HTTP يمكن للمتصفح قراءته؛ ممكن اتصال، عنوان خاطئ، CORS، أو مشكلة في السيرفر.
- لو ظهر CORS، الحل غالبًا في إعدادات backend للسماح بعنوان الفرونت والهيدرز المطلوبة، وليس تعطيل حماية المتصفح.

---

## 9. اختبار endpoints بعيدًا عن React

اختبر endpoint مستقلًا قبل ربطه بالواجهة؛ كده تعرف هل المشكلة من الباك إند أم من كود React.

### اختبار الأسابيع

```bash
curl "https://femora-backend-v3hw.onrender.com/api/v1/weeks" # GET عام لجلب الأسابيع
```

### اختبار تسجيل الدخول

```bash
curl -X POST "https://femora-backend-v3hw.onrender.com/api/v1/login" -H "Content-Type: application/json" -d "{\"email\":\"sara@example.com\",\"password\":\"password123\"}" # POST مع JSON body
```

استخدم حساب اختبار تملكه. لا تضع كلمة مرورك الحقيقية في سجل عام أو لقطة شاشة.

### اختبار endpoint محمي

بعد الحصول على JWT من login:

```bash
curl -X GET "https://femora-backend-v3hw.onrender.com/api/v1/get-pregnancy" -H "Authorization: Bearer YOUR_JWT_HERE" # GET مع JWT داخل Authorization header
```

لا تنشر التوكن الحقيقي في GitHub أو تشاركه مع أحد؛ اعتبره مثل مفتاح مؤقت للدخول إلى الحساب.

---

## 10. أخطاء متكررة وحلولها

### `401 Unauthorized`

- هل سجلت الدخول فعلًا؟
- هل تم حفظ المفتاح `femora_token`؟
- هل الـ interceptor يضيف `Authorization: Bearer ...`؟
- هل التوكن صالح؟ وجوده في localStorage لا يثبت صلاحيته.
- هل الـ backend يتوقع JWT بنفس السر والصيغة؟

### `403 Forbidden` عند تعديل أسبوع

غالبًا المستخدم لا يملك دور admin. لا تحاول الالتفاف على الصلاحيات من الفرونت؛ لازم حساب إداري مصرح به.

### `404` عند جلب الحمل

قد يكون المستخدم سجل الدخول لكن لم ينشئ سجل حمل بعد. تعامل مع الحالة كخطوة onboarding، وليس بالضرورة كعطل عام في التطبيق.

### أول request بطيء على Render

قد تتوقف الاستضافة المجانية بعد فترة خمول، فيتأخر أول طلب عند إيقاظ الخدمة. اعرض loading state، وتجنب إرسال نفس الطلب عشرات المرات تلقائيًا.

### تاريخ موعد الولادة ناقص يوم

التاريخ ISO مع `Z` يمثل UTC، وعرضه في timezone محلي قد يظهر يومًا مختلفًا في بعض الحالات. راجع تحويل التاريخ وطريقة العرض، ولا تغيّر حسابات الباك إند عشوائيًا. في التواريخ التي تمثل يومًا تقويميًا فقط، تعامل مع `YYYY-MM-DD` بعناية بدل تحويله إلى توقيت محلي دون فهم.

---

## 11. شكل ملفات مقترح

```text
src/
  lib/
    api.ts              # baseURL وJWT interceptor ومعالجة الأخطاء
    auth-api.ts         # signup/login/logout
    pregnancy-api.ts    # إنشاء الحمل وجلبه وتحديثه
    weeks-api.ts        # جلب الأسابيع وتفاصيل أسبوع وتعديله
  app/
    login/page.tsx      # صفحة تسجيل الدخول
    signup/page.tsx     # صفحة إنشاء الحساب
    dashboard/page.tsx  # لوحة المستخدم
    weeks/page.tsx      # قائمة الأسابيع
```

ده تنظيم مقترح، مش شرط. الفكرة إن components تهتم بالواجهة، وملفات `*-api.ts` تهتم بالـ requests.

---

## 12. مسؤولية كل جهة

### مسؤولية الفرونت إند

- قراءة القيم من الفورم.
- validation مبدئي لتحسين تجربة المستخدم.
- استدعاء endpoint الصحيح بالـ method والـ body الصحيحين.
- إظهار loading وsuccess وerror.
- إرسال JWT في endpoints المحمية.
- عرض الـ response الذي رجع من السيرفر.

### مسؤولية الباك إند

- إعادة التحقق من كل البيانات؛ تحقق الفرونت يمكن تجاوزه.
- التحقق من JWT وصلاحيات المستخدم.
- التأكد أن المستخدم لا يقرأ أو يعدل بيانات شخص آخر.
- الحفظ والقراءة من قاعدة البيانات.
- حساب بيانات الحمل التابعة لتاريخ آخر دورة.
- إرجاع status codes وJSON واضحة.
- عدم إرجاع أسرار أو كلمات مرور للفرونت.

---

## 13. Checklist قبل التسليم

- [ ] `NEXT_PUBLIC_API_BASE_URL` صحيح وتمت إعادة تشغيل dev server بعد تغييره.
- [ ] التسجيل يرسل `name`, `email`, `password`.
- [ ] تسجيل الدخول يرسل `email`, `password`.
- [ ] الـ token يتم حفظه بعد نجاح العملية فقط.
- [ ] الطلبات المحمية ترسل `Authorization: Bearer <token>`.
- [ ] لا يتم إرسال token في URL.
- [ ] كل request له loading state وerror handling.
- [ ] `GET /weeks` تتم معالجته كمصفوفة مباشرة إذا كان هذا هو response الفعلي.
- [ ] إنشاء الحمل يرسل `lastPeriodDate` بصيغة `YYYY-MM-DD`.
- [ ] الواجهة تستخدم `dueDate` وبقية القيم التي رجعت من السيرفر.
- [ ] تعديل الأسابيع مقصور على admin في الباك إند، وليس الواجهة فقط.
- [ ] لا توجد calls إلى endpoints غير موجودة.
- [ ] لا توجد أسرار في كود المتصفح أو متغيرات `NEXT_PUBLIC_`.
- [ ] تم اختبار endpoints بشكل مستقل قبل دمجها في React.

## الخلاصة

- `api.ts`: عنوان السيرفر، إعداد Axios، إضافة JWT، ومعالجة أخطاء عامة.
- `auth-api.ts`: signup/login/logout من جهة الفرونت.
- `pregnancy-api.ts`: إنشاء الحمل وجلبه وتحديثه.
- `weeks-api.ts`: قراءة الأسابيع وتعديلها.
- الـ component يستدعي service وينتظر النتيجة ثم يحدّث state.
- `await` ينتظر request، و`try/catch` يمسك الفشل، و`response.data` هو الـ body.
- الفرونت لا يثبت الصلاحيات؛ الباك إند هو صاحب القرار النهائي.
