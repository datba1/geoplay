import type { Lang } from './i18n';

type L = Record<Lang, string>;

export const HANDBOOK = {
  title: { en: 'GeoPlay Handbook', vi: 'Cẩm nang GeoPlay' } as L,
  intro: {
    en: 'Which game to play first, how hard each one is, how long it takes, and why the maps you grew up with are not telling the whole truth.',
    vi: 'Nên chơi trò nào trước, mỗi trò khó cỡ nào, mất bao lâu, và vì sao những tấm bản đồ quen thuộc không nói hết sự thật.',
  } as L,
  startTitle: { en: 'Where to start', vi: 'Bắt đầu từ đâu' } as L,
  difficulty: { en: 'Difficulty', vi: 'Độ khó' } as L,
  minutes: { en: '{n} min', vi: '{n} phút' } as L,
  tips: {
    'true-size': {
      en: 'The gentlest start. Place the big, compact countries first and leave the small ones to fill the gaps.',
      vi: 'Khởi đầu nhẹ nhàng nhất. Đặt các nước lớn, gọn trước rồi dùng nước nhỏ để lấp chỗ trống.',
    },
    'flag-fault': {
      en: 'Fast and twitchy. Before tapping, run through the flag in your head: colours, stars, emblem, stripes.',
      vi: 'Nhanh và căng thẳng. Trước khi chạm, hãy nhẩm lại lá cờ trong đầu: màu, sao, quốc huy, sọc.',
    },
    'border-sketch': {
      en: 'Harder than it looks. Get the overall proportions right first; coastline details matter much less.',
      vi: 'Khó hơn tưởng tượng. Hãy vẽ đúng tỉ lệ tổng thể trước; chi tiết bờ biển ít quan trọng hơn nhiều.',
    },
    'warped-map': {
      en: 'Look at the extremes first: which countries balloon, which vanish? Rich countries swell for money, crowded ones for people.',
      vi: 'Hãy nhìn các thái cực trước: nước nào phình to, nước nào biến mất? Nước giàu phình theo tiền, nước đông dân phình theo người.',
    },
  } as Record<string, L>,
  liesTitle: { en: 'Why maps "lie"', vi: 'Vì sao bản đồ "nói dối"' } as L,
  lies: [
    {
      en: 'A sphere cannot be flattened without stretching something. Every world map chooses what to distort: area, shape, distance or direction.',
      vi: 'Không thể trải phẳng một hình cầu mà không kéo giãn thứ gì đó. Mỗi bản đồ thế giới phải chọn méo đi cái gì: diện tích, hình dạng, khoảng cách hay phương hướng.',
    },
    {
      en: 'The Mercator projection (1569) keeps angles true, which made it perfect for sailors. The price: areas swell the further you get from the equator, so Greenland looks as big as Africa although Africa is about 14 times larger.',
      vi: 'Phép chiếu Mercator (1569) giữ đúng góc nên rất hợp cho người đi biển. Cái giá phải trả: diện tích phình to dần khi xa xích đạo, nên Greenland trông to bằng châu Phi dù châu Phi lớn hơn khoảng 14 lần.',
    },
    {
      en: 'True Size uses an equal-area projection centred on each country, so every piece is shown at its real size relative to the others.',
      vi: 'Trò Kích Thước Thật dùng phép chiếu đồng diện tích đặt tâm tại từng nước, nên mọi mảnh đều đúng kích thước thật so với nhau.',
    },
    {
      en: 'On a globe the shortest route between two points is a great circle. On a flat map it usually looks curved, which is why flight paths seem to bend towards the poles.',
      vi: 'Trên quả địa cầu, đường ngắn nhất giữa hai điểm là một cung tròn lớn. Trên bản đồ phẳng nó thường trông cong, vì vậy đường bay có vẻ uốn về phía cực.',
    },
  ] as L[],
  progressTitle: { en: 'Scores, stamps and levels', vi: 'Điểm, con dấu và cấp độ' } as L,
  progress: [
    {
      en: 'Every finished game gives 10 to 50 XP depending on your score. Level 2 needs 60 XP, and each level after that needs a bit more.',
      vi: 'Mỗi trò hoàn thành cho 10 đến 50 XP tuỳ điểm. Lên cấp 2 cần 60 XP, các cấp sau cần nhiều hơn một chút.',
    },
    {
      en: 'Countries you score in a game are stamped into your passport. Badges reward milestones, and new items unlock as you level up.',
      vi: 'Các nước bạn ghi điểm sẽ được đóng dấu vào hộ chiếu. Huy hiệu thưởng cho các cột mốc, và vật phẩm mới mở khoá khi bạn lên cấp.',
    },
    {
      en: 'The daily challenge gives everyone the same three puzzles. Finish all three for +50 XP and a streak day; only your first try of each counts.',
      vi: 'Thử thách ngày cho mọi người cùng ba câu đố. Hoàn thành cả ba để nhận +50 XP và một ngày chuỗi; chỉ lần chơi đầu tiên của mỗi trò được tính.',
    },
    {
      en: 'Progress lives in this browser. Set a nickname to appear on the online leaderboard; nothing else is sent.',
      vi: 'Tiến trình được lưu trong trình duyệt này. Đặt biệt danh để xuất hiện trên bảng xếp hạng; ngoài ra không gửi gì khác.',
    },
  ] as L[],
};
