export interface TajweedRuleItem {
  id: string;
  title: string;
  colorName: string;
  colorHex: string;
  letters: string;
  definition: string;
  examples: {
    text: string;
    surah: string;
    highlight: string;
  }[];
  explanation: string;
}

export interface TajweedCategory {
  id: string;
  title: string;
  iconName: string;
  badge: string;
  rules: TajweedRuleItem[];
}

export const TAJWEED_CATEGORIES: TajweedCategory[] = [
  {
    id: 'noon-sakina',
    title: 'أحكام النون الساكنة والتنوين',
    iconName: 'Sparkles',
    badge: '٤ أحكام رئيسية',
    rules: [
      {
        id: 'izhar',
        title: 'الإظهار الحلقي',
        colorName: 'أسود / بدون لون خاص',
        colorHex: '#14231F',
        letters: 'ء ، هـ ، ع ، ح ، غ ، خ',
        definition: 'إخراج كل حرف من مخرجه بغير غنة في الحرف المظهر.',
        explanation: 'إذا جاء بعد النون الساكنة أو التنوين أحد حروف الحلق الستة، وجب إظهار النون نطقاً واضحاً من غير وقف ولا سكت ولا تشديد ولا غنة ظاهرة.',
        examples: [
          { text: 'مَنْ آمَنَ', surah: 'البقرة: ٦٢', highlight: 'نْ آ' },
          { text: 'عَلِيمٌ حَكِيمٌ', surah: 'النساء: ٢٦', highlight: 'مٌ حَ' },
          { text: 'وَأَنْهَارٌ', surah: 'محمد: ١٥', highlight: 'نْهَ' },
        ],
      },
      {
        id: 'idgham-ghunnah',
        title: 'الإدغام بغنة (ناقص)',
        colorName: 'أخضر تيل',
        colorHex: '#00897B',
        letters: 'ي ، ن ، م ، و (يَنْمُو)',
        definition: 'إدخال النون الساكنة أو التنوين في الحرف الذي يليها مع بقاء صفة الغنة بمقدار حركتين.',
        explanation: 'يشترط فيه أن يكون في كلمتين؛ فإذا اجتمعا في كلمة واحدة وجب الإظهار المطلق مثل: (دنيا، قنوان، صنوان، بنيان).',
        examples: [
          { text: 'مَن يَقُولُ', surah: 'البقرة: ٨', highlight: 'ن ي' },
          { text: 'خَيْرًا يَرَهُ', surah: 'الزلزلة: ٧', highlight: 'رًا ي' },
          { text: 'مِّن وَالٍ', surah: 'الرعد: ١١', highlight: 'ن و' },
        ],
      },
      {
        id: 'idgham-bighunnah',
        title: 'الإدغام بغير غنة (كامل)',
        colorName: 'رمادي (حرف لا يلفظ)',
        colorHex: '#8D99AE',
        letters: 'ل ، ر',
        definition: 'إدخال النون الساكنة أو التنوين في اللام أو الراء إدخالاً تاماً دون بقاء أي أثر للغنة.',
        explanation: 'تسقط النون لفظاً ويدغم الحرف في اللام أو الراء المشددة مباشرة.',
        examples: [
          { text: 'مِن رَّبِّهِمْ', surah: 'البقرة: ٥', highlight: 'ن ر' },
          { text: 'هُدًى لِّلْمُتَّقِينَ', surah: 'البقرة: ٢', highlight: 'دًى لِّ' },
        ],
      },
      {
        id: 'iqlab',
        title: 'الإقلاب',
        colorName: 'أخضر فيروزي (ميم قائمة ۢ)',
        colorHex: '#00897B',
        letters: 'ب (حرف الباء فقط)',
        definition: 'قلب النون الساكنة أو التنوين ميماً مخفاة مع مراعاة الغنة بمقدار حركتين.',
        explanation: 'ترسم في المصحف ميم قائمة صغيرة (ۢ) فوق النون أو بدلاً من الحركة الثانية للتنوين.',
        examples: [
          { text: 'مِن بَعْدِ', surah: 'البقرة: ٢٧', highlight: 'ن ب' },
          { text: 'عَلِيمٌ بِذَاتِ الصُّدُورِ', surah: 'آل عمران: ١١٩', highlight: 'مٌ ب' },
          { text: 'أَنبِئْهُم', surah: 'البقرة: ٣٣', highlight: 'نب' },
        ],
      },
      {
        id: 'ikhfa',
        title: 'الإخفاء الحقيقي',
        colorName: 'أخضر زرعي',
        colorHex: '#2E7D32',
        letters: 'ص ، ذ ، ث ، ك ، ج ، ش ، ق ، س ، د ، ط ، ز ، ف ، ت ، ض ، ظ (١٥ حرفاً)',
        definition: 'النطق بالحرف بصفة بين الإظهار والإدغام عارياً عن التشديد مع بقاء الغنة في الحرف الأول بمقدار حركتين.',
        explanation: 'تتبع الغنة الحرف الذي بعدها تفخيماً (مع حروف الاستعلاء الصاد والضاد والطاء والظاء والقاف) وترقيقاً مع بقية الحروف.',
        examples: [
          { text: 'إِن كُنتُمْ', surah: 'البقرة: ٢٣', highlight: 'ن ك' },
          { text: 'مِن قَبْلِكَ', surah: 'البقرة: ٤', highlight: 'ن ق' },
          { text: 'أَنفُسَهُمْ', surah: 'البقرة: ٩', highlight: 'نف' },
        ],
      },
    ],
  },
  {
    id: 'madd-rules',
    title: 'أحكام المدود وأقسامها',
    iconName: 'Layers',
    badge: 'مقادير المد بالألوان',
    rules: [
      {
        id: 'madd-asli',
        title: 'المد الطبيعي (الأصلي)',
        colorName: 'برتقالي هادئ',
        colorHex: '#E65100',
        letters: 'الألف والواو والياء السواكن (نُوحِيهَا)',
        definition: 'المد الذي لا تقوم ذات الحرف إلا به ولا يتوقف على سبب من همز أو سكون.',
        explanation: 'يمد حركتين وجوباً، وهو أصل المدود كلها.',
        examples: [
          { text: 'قَالَ', surah: 'البقرة: ٣٠', highlight: 'قَا' },
          { text: 'يَقُولُ', surah: 'البقرة: ٨', highlight: 'قُو' },
          { text: 'قِيلَ', surah: 'البقرة: ١١', highlight: 'قِي' },
        ],
      },
      {
        id: 'madd-muttasil',
        title: 'المد الواجب المتصل',
        colorName: 'أحمر صريح',
        colorHex: '#D32F2F',
        letters: 'حرف مد بعده همزة في كلمة واحدة',
        definition: 'أن يأتي حرف المد وتليه همزة في الكلمة نفسها.',
        explanation: 'يمد ٤ أو ٥ حركات وصلاً ووقفاً، ويلحق به ٦ حركات عند الوقف المتطرف مثل {السَّمَآءَ}.',
        examples: [
          { text: 'السَّمَآءَ', surah: 'البقرة: ٢٢', highlight: 'مَآءَ' },
          { text: 'جِيٓءَ', surah: 'الفجر: ٢٣', highlight: 'جِيٓءَ' },
          { text: 'سُوٓءَ', surah: 'النحل: ٢٨', highlight: 'سُوٓءَ' },
        ],
      },
      {
        id: 'madd-munfasil',
        title: 'المد الجائز المنفصل',
        colorName: 'برتقالي محمر',
        colorHex: '#E65100',
        letters: 'حرف مد في آخر الكلمة وهمزة في أول الكلمة التالية',
        definition: 'أن يكون حرف المد في نهاية الكلمة وتأتي الهمزة في بداية الكلمة التي تليها مباشرة.',
        explanation: 'يمد ٢ أو ٤ أو ٥ حركات لحفص من طريق الشاطبية.',
        examples: [
          { text: 'إِنَّآ أَعْطَيْنَاكَ', surah: 'الكوثر: ١', highlight: 'نَّآ أَ' },
          { text: 'يَـٰٓأَيُّهَا', surah: 'البقرة: ٢١', highlight: 'يَـٰٓأَ' },
          { text: 'قُوٓاْ أَنفُسَكُمْ', surah: 'التحريم: ٦', highlight: 'وٓاْ أَ' },
        ],
      },
      {
        id: 'madd-lazim',
        title: 'المد اللازم (كلمي وحرفي)',
        colorName: 'أحمر داكن قرمزي',
        colorHex: '#8B0000',
        letters: 'حرف مد بعده سكون أصلي لازم مشدد أو مخفف',
        definition: 'أن يأتي بعد حرف المد سكون أصلي ثابت وصلاً ووقفاً.',
        explanation: 'يمد ٦ حركات لزوماً بلا خلاف عند جميع القراء، مثل: {الضَّآلِّينَ}، {الْحَآقَّةُ}، وفواتح السور {الٓمٓ}، {قٓ}.',
        examples: [
          { text: 'وَلَا الضَّآلِّينَ', surah: 'الفاتحة: ٧', highlight: 'ضَّآلِّ' },
          { text: 'الْحَآقَّةُ', surah: 'الحاقة: ١', highlight: 'حَآقَّ' },
          { text: 'الٓمٓ', surah: 'البقرة: ١', highlight: 'لٓمٓ' },
        ],
      },
      {
        id: 'madd-arid',
        title: 'المد العارض للسكون واللين',
        colorName: 'برتقالي',
        colorHex: '#FB8C00',
        letters: 'حرف مد أو لين يليه حرف سكن بسبب الوقف',
        definition: 'أن يقع بعد حرف المد حرف متحرك سكن للوقف عليه.',
        explanation: 'يجوز فيه القصر (حركتان)، والتوسط (٤ حركات)، والإشباع (٦ حركات).',
        examples: [
          { text: 'الْعَالَمِينَ', surah: 'الفاتحة: ٢', highlight: 'مِينَ' },
          { text: 'نَسْتَعِينُ', surah: 'الفاتحة: ٥', highlight: 'عِينُ' },
          { text: 'خَوْفٍ', surah: 'قريش: ٤', highlight: 'خَوْفٍ' },
        ],
      },
    ],
  },
  {
    id: 'qalqalah',
    title: 'أحكام القلقلة',
    iconName: 'Volume2',
    badge: 'حروف قُطْبُ جَدّ',
    rules: [
      {
        id: 'qalqalah-kubra',
        title: 'القلقلة الكبرى',
        colorName: 'أزرق صريح',
        colorHex: '#1565C0',
        letters: 'ق ، ط ، ب ، ج ، د (المشدد الموقوف عليه)',
        definition: 'اضطراب المخرج عند النطق بالحرف الساكن المشدد الموقوف عليه بحيث يسمع له نبرة قوية.',
        explanation: 'أعلى مراتب القلقلة وضوحاً وأقواها أثراً في السمع.',
        examples: [
          { text: 'تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ', surah: 'المسد: ١', highlight: 'وَتَبَّ' },
          { text: 'الْحَقُّ', surah: 'البقرة: ١٤٧', highlight: 'الْحَقُّ' },
        ],
      },
      {
        id: 'qalqalah-wusta',
        title: 'القلقلة الوسطى',
        colorName: 'أزرق صريح',
        colorHex: '#1565C0',
        letters: 'حروف قطب جد الساكنة الموقوف عليها (مخففة)',
        definition: 'أن يكون حرف القلقلة ساكناً غير مشدد في آخر الكلمة عند الوقف عليه.',
        explanation: 'تأتي بعد الكبرى في قوة الصوت وجلائه.',
        examples: [
          { text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', surah: 'الفلق: ١', highlight: 'الْفَلَقِ' },
          { text: 'مِن شَرِّ مَا خَلَقَ', surah: 'الفلق: ٢', highlight: 'خَلَقَ' },
          { text: 'مُحِيطٌ', surah: 'البقرة: ١٩', highlight: 'مُحِيطٌ' },
        ],
      },
      {
        id: 'qalqalah-sughra',
        title: 'القلقلة الصغرى',
        colorName: 'أزرق صريح',
        colorHex: '#1565C0',
        letters: 'حروف قطب جد الساكنة في وسط الكلمة أو وصلاً',
        definition: 'أن يكون حرف القلقلة ساكناً في وسط الكلمة أو في آخر الكلمة وصلاً.',
        explanation: 'تكون أخف المراتب في الصوت ولكن مخرجها يضطرب اضطراباً بيناً.',
        examples: [
          { text: 'أَتَجْعَلُ فِيهَا', surah: 'البقرة: ٣٠', highlight: 'تَجْعَلُ' },
          { text: 'يَبْسُطُ', surah: 'الرعد: ٢٦', highlight: 'يَبْسُطُ' },
          { text: 'يَدْعُونَ', surah: 'الأنعام: ٥٢', highlight: 'يَدْعُونَ' },
        ],
      },
    ],
  },
  {
    id: 'meem-sakina',
    title: 'أحكام الميم الساكنة',
    iconName: 'BookOpen',
    badge: '٣ أحكام شفوية',
    rules: [
      {
        id: 'ikhfa-shafawi',
        title: 'الإخفاء الشفوي',
        colorName: 'أخضر تيل',
        colorHex: '#00897B',
        letters: 'ب (حرف الباء فقط)',
        definition: 'نطق الميم الساكنة إذا تلاها حرف الباء بحالة بين الإظهار والإدغام مع الغنة بمقدار حركتين.',
        explanation: 'يسمى شفوياً لأن الميم والباء يخرجان من الشفتين.',
        examples: [
          { text: 'تَرْمِيهِم بِحِجَارَةٍ', surah: 'الفيل: ٤', highlight: 'هِم بِ' },
          { text: 'وَهُم بِالْآخِرَةِ', surah: 'يوسف: ٣٧', highlight: 'هُم بِ' },
        ],
      },
      {
        id: 'idgham-shafawi',
        title: 'إدغام المتماثلين الصغير',
        colorName: 'أخضر غنة',
        colorHex: '#2E7D32',
        letters: 'م (الميم فقط)',
        definition: 'إدغام الميم الساكنة في الميم المتحركة بعدها لتصيرا ميماً واحدة مشددة بغنة كاملة حركتين.',
        explanation: 'مثل: {لَهُم مَّا يَشَاءُونَ}.',
        examples: [
          { text: 'لَهُم مَّا يَشَاءُونَ', surah: 'ق: ٣٥', highlight: 'هُم مَّ' },
          { text: 'فِي قُلُوبِهِم مَّرَضٌ', surah: 'البقرة: ١٠', highlight: 'هِم مَّ' },
        ],
      },
      {
        id: 'izhar-shafawi',
        title: 'الإظهار الشفوي',
        colorName: 'بدون تلوين',
        colorHex: '#14231F',
        letters: 'بقية الحروف الـ ٢٦ (وأشدها عند الفاء والواو)',
        definition: 'إخراج الميم الساكنة من مخرجها دون غنة ظاهرة عند ملاقاتها لبقية الحروف.',
        explanation: 'يجب الحذر الشديد من إخفائها عند حرفي الواو والفاء لقرب المخرج والاتحاد.',
        examples: [
          { text: 'عَلَيْهِمْ وَلَا الضَّآلِّينَ', surah: 'الفاتحة: ٧', highlight: 'هِمْ وَ' },
          { text: 'هُمْ فِيهَا', surah: 'البقرة: ٢٥', highlight: 'هُمْ فِ' },
        ],
      },
    ],
  },
];
