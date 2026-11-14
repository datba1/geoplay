import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type FactSeed = {
  category: string;
  questionEn: string; answerEn: string; detailEn: string;
  questionVi: string; answerVi: string; detailVi: string;
  source?: string;
};

const facts: FactSeed[] = [
  {
    category: 'general',
    questionEn: 'How many provinces does Vietnam have after the 2025 merger?',
    answerEn: '34 provinces and cities.',
    detailEn: 'From 1 July 2025 Vietnam reduced its provincial-level units from 63 to 34 and abolished the district level.',
    questionVi: 'Sau đợt sáp nhập năm 2025, Việt Nam có bao nhiêu tỉnh thành?',
    answerVi: '34 tỉnh, thành phố.',
    detailVi: 'Từ ngày 1/7/2025, Việt Nam giảm số đơn vị hành chính cấp tỉnh từ 63 xuống 34 và bỏ cấp huyện.',
    source: 'Government of Vietnam · 2025',
  },
  {
    category: 'size',
    questionEn: 'Which is bigger: Russia or the surface of Pluto?',
    answerEn: 'Russia, at about 17.1 million km².',
    detailEn: 'Pluto has a surface area of roughly 16.7 million km², slightly less than Russia.',
    questionVi: 'Cái nào lớn hơn: nước Nga hay bề mặt sao Diêm Vương?',
    answerVi: 'Nước Nga, khoảng 17,1 triệu km².',
    detailVi: 'Diện tích bề mặt sao Diêm Vương khoảng 16,7 triệu km², nhỏ hơn Nga một chút.',
  },
  {
    category: 'maps',
    questionEn: 'Greenland looks as big as Africa on many maps. How much bigger is Africa really?',
    answerEn: 'About 14 times bigger.',
    detailEn: 'Greenland is about 2.2 million km², Africa about 30 million km². The Mercator projection inflates areas near the poles.',
    questionVi: 'Trên nhiều bản đồ, Greenland trông to bằng châu Phi. Thực tế châu Phi lớn hơn bao nhiêu?',
    answerVi: 'Khoảng 14 lần.',
    detailVi: 'Greenland rộng khoảng 2,2 triệu km², châu Phi khoảng 30 triệu km². Phép chiếu Mercator phóng to các vùng gần cực.',
  },
  {
    category: 'maps',
    questionEn: 'Who created the map projection most of us grew up with?',
    answerEn: 'Gerardus Mercator, in 1569.',
    detailEn: 'It was designed for sea navigation: it keeps angles true, so a constant compass bearing is a straight line, at the cost of distorting area.',
    questionVi: 'Ai đã tạo ra phép chiếu bản đồ quen thuộc nhất với chúng ta?',
    answerVi: 'Gerardus Mercator, năm 1569.',
    detailVi: 'Nó được thiết kế cho hàng hải: giữ đúng góc nên hướng la bàn cố định là một đường thẳng, nhưng làm sai lệch diện tích.',
  },
  {
    category: 'general',
    questionEn: 'Which country spans the most time zones?',
    answerEn: 'France, with 12.',
    detailEn: 'Thanks to its overseas territories in the Pacific, Indian Ocean, Caribbean and South America (13 if you count its Antarctic claim).',
    questionVi: 'Quốc gia nào trải dài qua nhiều múi giờ nhất?',
    answerVi: 'Pháp, với 12 múi giờ.',
    detailVi: 'Nhờ các vùng lãnh thổ hải ngoại ở Thái Bình Dương, Ấn Độ Dương, Caribe và Nam Mỹ (13 nếu tính cả vùng tuyên bố chủ quyền ở Nam Cực).',
  },
  {
    category: 'flags',
    questionEn: 'Which is the only national flag that is not a rectangle?',
    answerEn: 'Nepal.',
    detailEn: 'Its flag is made of two stacked pennants, representing the Himalayas.',
    questionVi: 'Lá cờ quốc gia duy nhất không có hình chữ nhật là của nước nào?',
    answerVi: 'Nepal.',
    detailVi: 'Lá cờ gồm hai hình tam giác chồng lên nhau, tượng trưng cho dãy Himalaya.',
  },
  {
    category: 'size',
    questionEn: 'What is the smallest country in the world?',
    answerEn: 'Vatican City, about 0.44 km².',
    detailEn: 'It is an enclave inside the city of Rome.',
    questionVi: 'Quốc gia nhỏ nhất thế giới là nước nào?',
    answerVi: 'Thành Vatican, khoảng 0,44 km².',
    detailVi: 'Đây là một vùng nằm lọt trong thành phố Rome.',
  },
  {
    category: 'borders',
    questionEn: 'Which countries have the most neighbours?',
    answerEn: 'China and Russia, with 14 each.',
    detailEn: 'Both stretch across huge areas of Eurasia and touch many countries by land.',
    questionVi: 'Những quốc gia nào có nhiều nước láng giềng nhất?',
    answerVi: 'Trung Quốc và Nga, mỗi nước 14.',
    detailVi: 'Cả hai trải rộng khắp lục địa Á - Âu và giáp nhiều nước trên đất liền.',
  },
  {
    category: 'borders',
    questionEn: 'Which countries are "doubly landlocked"?',
    answerEn: 'Liechtenstein and Uzbekistan.',
    detailEn: 'They are landlocked and every one of their neighbours is landlocked too.',
    questionVi: 'Những nước nào "kép không giáp biển"?',
    answerVi: 'Liechtenstein và Uzbekistan.',
    detailVi: 'Không giáp biển, và tất cả các nước láng giềng của họ cũng không giáp biển.',
  },
  {
    category: 'nature',
    questionEn: 'How high is Mount Everest?',
    answerEn: '8,849 metres.',
    detailEn: 'Figure from the joint China–Nepal survey announced in 2020.',
    questionVi: 'Đỉnh Everest cao bao nhiêu?',
    answerVi: '8.849 mét.',
    detailVi: 'Số liệu từ cuộc đo đạc chung giữa Trung Quốc và Nepal công bố năm 2020.',
  },
  {
    category: 'nature',
    questionEn: 'How many countries does the Mekong river flow through?',
    answerEn: 'Six.',
    detailEn: 'China, Myanmar, Laos, Thailand, Cambodia and Vietnam, where it ends in the Mekong Delta.',
    questionVi: 'Sông Mê Kông chảy qua bao nhiêu quốc gia?',
    answerVi: 'Sáu.',
    detailVi: 'Trung Quốc, Myanmar, Lào, Thái Lan, Campuchia và Việt Nam, nơi sông đổ ra biển ở đồng bằng sông Cửu Long.',
  },
  {
    category: 'general',
    questionEn: 'Roughly how many islands make up Indonesia?',
    answerEn: 'More than 17,000.',
    detailEn: 'It is the largest archipelagic country in the world.',
    questionVi: 'Indonesia có khoảng bao nhiêu hòn đảo?',
    answerVi: 'Hơn 17.000.',
    detailVi: 'Đây là quốc gia quần đảo lớn nhất thế giới.',
  },
  {
    category: 'size',
    questionEn: 'Which is wider: Australia or the Moon?',
    answerEn: 'Australia.',
    detailEn: 'Mainland Australia is about 4,000 km from east to west; the Moon is about 3,474 km across.',
    questionVi: 'Cái nào rộng hơn: nước Úc hay Mặt Trăng?',
    answerVi: 'Nước Úc.',
    detailVi: 'Lục địa Úc rộng khoảng 4.000 km theo chiều đông - tây; đường kính Mặt Trăng khoảng 3.474 km.',
  },
  {
    category: 'size',
    questionEn: 'How long is Chile from north to south?',
    answerEn: 'About 4,300 km.',
    detailEn: 'Yet it is rarely more than about 350 km wide, which makes it one of the longest and narrowest countries.',
    questionVi: 'Chile dài bao nhiêu theo chiều bắc - nam?',
    answerVi: 'Khoảng 4.300 km.',
    detailVi: 'Nhưng hiếm khi rộng quá khoảng 350 km, khiến Chile là một trong những nước dài và hẹp nhất.',
  },
  {
    category: 'flags',
    questionEn: 'Which national flag is considered the oldest still in use?',
    answerEn: 'Denmark\'s, the Dannebrog.',
    detailEn: 'Tradition dates the red flag with a white Nordic cross to 1219.',
    questionVi: 'Lá cờ quốc gia nào được coi là lâu đời nhất còn được sử dụng?',
    answerVi: 'Cờ Đan Mạch (Dannebrog).',
    detailVi: 'Theo truyền thuyết, lá cờ đỏ có chữ thập trắng ra đời năm 1219.',
  },
  {
    category: 'general',
    questionEn: 'Which sovereign country is the most sparsely populated?',
    answerEn: 'Mongolia.',
    detailEn: 'About 2 people per km², and nearly half the population lives in the capital, Ulaanbaatar.',
    questionVi: 'Quốc gia có chủ quyền nào thưa dân nhất?',
    answerVi: 'Mông Cổ.',
    detailVi: 'Khoảng 2 người/km², và gần một nửa dân số sống ở thủ đô Ulaanbaatar.',
  },
  {
    category: 'nature',
    questionEn: 'Which is the deepest lake on Earth?',
    answerEn: 'Lake Baikal in Russia, about 1,640 m deep.',
    detailEn: 'It holds roughly a fifth of the world\'s unfrozen surface fresh water.',
    questionVi: 'Hồ nào sâu nhất Trái Đất?',
    answerVi: 'Hồ Baikal ở Nga, sâu khoảng 1.640 m.',
    detailVi: 'Hồ chứa khoảng một phần năm lượng nước ngọt bề mặt không đóng băng của thế giới.',
  },
];

async function main() {
  await prisma.fact.deleteMany();
  await prisma.fact.createMany({ data: facts });
  console.log(`Seeded ${facts.length} facts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
