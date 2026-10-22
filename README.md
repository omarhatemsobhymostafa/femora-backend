# Pregnancy Weeks — دليل ربط الفرونت إند

> دليل عملي يساعدك تبني فرونت إند ويتواصل مع Pregnancy Weeks API.

الريبو ده فيه الباك إند المبني بـ Express وMongoDB بس. استخدم الدليل ده كمرجع للـ API وإزاي تربط الفرونت إند بيه. الأمثلة ماشية حسب سلوك الباك إند الحالي، بما في ده أسماء الحقول والقيود الموجودة.

## المحتويات

- [نظرة عامة على المشروع](#نظرة-عامة-على-المشروع)
- [تشغيل الباك إند](#تشغيل-الباك-إند)
- [ملخص سريع للـ API](#ملخص-سريع-للـ-api)
- [تسجيل الدخول والتحقق](#تسجيل-الدخول-والتحقق)
- [بيانات الأسابيع](#بيانات-الأسابيع)
- [ربط الفرونت إند](#ربط-الفرونت-إند)
- [تجهيز API client للفرونت إند](#تجهيز-api-client-للفرونت-إند)
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

### تجهيز API client للفرونت إند

الـ API client عبارة عن module صغير مشترك، بيبقى عارف العنوان الأساسي للباك إند، وإزاي يبعت JSON، وإزاي يضيف بيانات تسجيل الدخول، وإزاي يوضح فشل الطلب. خليك حاطط المنطق ده في مكان واحد بدل ما تكرر إعداد `fetch` أو `axios` في كل شاشة. اختار `fetch` أو Axios؛ الأمثلة اللي جاية بدائل لبعض ومش مطلوب تستخدمهم مع بعض.

#### إعداد عنوان الـ API

لو الفرونت إند معمول بـ Vite، حدد العنوان في ملف `.env` بتاع مشروع الفرونت إند:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Vite بيعرض المتغيرات اللي بتبدأ بـ `VITE_` لكود المتصفح، عشان كده ماتحطش فيها أسرار. بعد ما تغيّر `.env` اعمل restart لسيرفر الفرونت إند. باقي الـ frameworks ممكن تستخدم أسماء مختلفة؛ اتبع طريقة المتغيرات العامة الخاصة بالـ framework بتاعك. لو الفرونت إند والباك إند على نفس الـ origin، ممكن تستخدم عنوان API نسبي بشرط إن web server أو development proxy يوجّه `/api` للباك إند.

#### الاختيار الأول: `fetch` (موجود جاهز في المتصفحات)

`fetch` بيبعت HTTP request وبيرجع `Response`. هو **مش** بيرفض الـ promise لمجرد إن السيرفر رجّع HTTP error زي `400` أو `500`؛ لازم تراجع `response.ok` بنفسك. الـ helper اللي تحت بيقرأ الـ body كنص الأول عشان يتعامل مع JSON أو خطأ نصّي أو body فاضي، من غير ما يفترض إن كل الردود JSON.

```js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

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
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1",
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

مثال React context اللي جاي بيحتفظ بالـ JWT في الذاكرة وبيوفر وظائف إنشاء الحساب وتسجيل الدخول والخروج لباقي التطبيق. المثال بيشتغل مع `authApi` بتاع Axios اللي فوق. حطه في ملف بالفرونت إند زي `src/auth/AuthContext.jsx` وعدّل مسارات الـ imports حسب مشروعك.

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

لفّ التطبيق كله (أو المسارات اللي محتاجة تسجيل دخول) بالـ provider:

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
  api/          # عنوان الـ API الأساسي وrequest helper ودوال الـ endpoints
  components/   # عناصر واجهة مشتركة زي الفورم وحالات التحميل والأخطاء
  features/
    auth/       # شاشات وحالة إنشاء الحساب وتسجيل الدخول
    weeks/      # عرض الأسابيع وتفاصيلها وتعديلها
  types/        # أنواع مشتركة لطلبات وردود الـ API
  app/          # المسارات والإعدادات العامة للتطبيق
```

على قد ما تقدر، خلي استدعاءات الـ API برّه components العرض. عرّف أنواع بيانات الـ API بنفس أسماء الحقول اللي بترجع من السيرفر، واعرض labels واضحة وحالات ظاهرة للتحميل والتحقق وفشل الطلبات.
