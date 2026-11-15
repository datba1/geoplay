/** Season petitions for Founders. Every one is a choice between two trade-offs. */
export interface Effects { gold?: number; food?: number; materials?: number; army?: number; stability?: number; relations?: number }
type T = { en: string; vi: string };
export interface Petition {
  id: string;
  text: T;
  /** 0 spring … 3 winter; omitted = any season */
  season?: number;
  coast?: boolean;
  options: [{ label: T; effects: Effects; result: T }, { label: T; effects: Effects; result: T }];
}

const p = (
  id: string, en: string, vi: string,
  a: [string, string, Effects, string, string],
  b: [string, string, Effects, string, string],
  extra: Partial<Petition> = {},
): Petition => ({
  id, text: { en, vi }, ...extra,
  options: [
    { label: { en: a[0], vi: a[1] }, effects: a[2], result: { en: a[3], vi: a[4] } },
    { label: { en: b[0], vi: b[1] }, effects: b[2], result: { en: b[3], vi: b[4] } },
  ],
});

export const PETITIONS: Petition[] = [
  p('surveyors', 'Surveyors ask for funds to map the river valleys properly.', 'Các nhà đo đạc xin kinh phí để vẽ bản đồ các thung lũng sông.',
    ['Fund the survey', 'Cấp kinh phí', { gold: -15, food: 8, stability: 2 }, 'New maps reveal fertile fields.', 'Bản đồ mới tìm ra những cánh đồng màu mỡ.'],
    ['Not this year', 'Để năm sau', {}, 'The surveyors pack up their chains.', 'Các nhà đo đạc thu dọn dụng cụ.']),
  p('salt', 'A salt trader offers a year of supply at a fixed price.', 'Một thương nhân muối đề nghị cung cấp cả năm với giá cố định.',
    ['Sign the deal', 'Ký hợp đồng', { gold: -10, food: 12 }, 'Salted stores will keep through the cold.', 'Đồ muối sẽ để được qua mùa lạnh.'],
    ['Haggle him away', 'Mặc cả cho đi', { stability: -1 }, 'He sells to a rival instead.', 'Ông ta bán cho nước khác.']),
  p('bridge', 'Villagers want a stone bridge over the ford that floods each year.', 'Dân làng muốn xây cầu đá qua bến lội năm nào cũng ngập.',
    ['Build it', 'Xây cầu', { materials: -15, stability: 4 }, 'Carts cross dry-shod at last.', 'Cuối cùng xe bò đã qua sông không ướt.'],
    ['Ferry is enough', 'Đò là đủ', { stability: -2 }, 'Grumbling continues at the ford.', 'Dân vẫn càu nhàu ở bến lội.']),
  p('scholars', 'Wandering scholars ask to open a school in the capital.', 'Các học giả lang bạt xin mở trường ở kinh đô.',
    ['Give them a hall', 'Cấp cho họ một gian nhà', { gold: -10, stability: 3, relations: 4 }, 'Neighbours send their children to study.', 'Các nước láng giềng gửi con sang học.'],
    ['Turn them away', 'Từ chối', {}, 'They take their books elsewhere.', 'Họ mang sách đi nơi khác.']),
  p('veterans', 'Old soldiers ask for land to farm after their service.', 'Lính già xin đất để cày cấy sau khi giải ngũ.',
    ['Grant the land', 'Cấp đất', { army: -3, food: 10, stability: 3 }, 'Veterans settle the border farms.', 'Cựu binh khai khẩn đất biên.'],
    ['Keep them in the ranks', 'Giữ họ trong quân ngũ', { army: 2, stability: -3 }, 'The ranks are full but sullen.', 'Quân số đủ nhưng lòng quân không vui.']),
  p('drought', 'The wells are low after a dry spell. Farmers beg for help.', 'Giếng cạn sau đợt khô hạn. Nông dân xin cứu giúp.',
    ['Open the granary', 'Mở kho lương', { food: -15, stability: 4 }, 'Families make it to the rains.', 'Các gia đình cầm cự được tới mùa mưa.'],
    ['Dig deeper wells', 'Đào giếng sâu hơn', { materials: -10, gold: -5, food: 4 }, 'Cool water rises again.', 'Nước mát lại dâng lên.'], { season: 1 }),
  p('harvest-fair', 'Farmers want to hold a harvest fair in the market towns.', 'Nông dân muốn tổ chức hội chợ mùa gặt ở các thị trấn.',
    ['Sponsor the fair', 'Tài trợ hội chợ', { gold: -10, food: -5, stability: 5 }, 'Music and roasted corn fill the squares.', 'Tiếng nhạc và ngô nướng rộn khắp các quảng trường.'],
    ['Tax the stalls', 'Đánh thuế quầy hàng', { gold: 12, stability: -3 }, 'The fair is smaller this year.', 'Hội chợ năm nay nhỏ hơn.'], { season: 2 }),
  p('frost', 'An early frost threatens the herds in the hills.', 'Sương giá sớm đe dọa đàn gia súc trên đồi.',
    ['Buy fodder', 'Mua cỏ khô', { gold: -12, food: 5 }, 'The herds are saved.', 'Đàn gia súc được cứu.'],
    ['Slaughter early', 'Mổ thịt sớm', { food: 10, stability: -2 }, 'A feast now, fewer calves next spring.', 'Ăn no bây giờ, xuân sau ít bê con.'], { season: 3 }),
  p('planting', 'Seed is scarce this spring. Lend seed grain from the stores?', 'Mùa xuân này thiếu giống. Có cho vay thóc giống từ kho không?',
    ['Lend the seed', 'Cho vay giống', { food: -10, stability: 2, gold: 6 }, 'Fields turn green across the realm.', 'Ruộng đồng xanh mướt khắp nơi.'],
    ['Keep the stores', 'Giữ kho', { stability: -3 }, 'Some fields lie fallow.', 'Một số ruộng bị bỏ hoang.'], { season: 0 }),
  p('pirates', 'Raiders have been seen off the coast.', 'Có cướp biển xuất hiện ngoài khơi.',
    ['Arm the harbours', 'Vũ trang các cảng', { materials: -10, army: 2 }, 'Watchtowers rise over the bays.', 'Tháp canh mọc lên trên các vịnh.'],
    ['Pay them off', 'Nộp tiền cho chúng', { gold: -20, stability: -1 }, 'The sails turn away, for now.', 'Những cánh buồm quay đi, tạm thời.'], { coast: true }),
  p('pearls', 'Divers found a bed of pearl oysters in the shallows.', 'Thợ lặn tìm thấy bãi trai ngọc ở vùng nước nông.',
    ['Royal monopoly', 'Triều đình độc quyền', { gold: 20, stability: -2 }, 'Pearls fill the treasury.', 'Ngọc trai đầy ngân khố.'],
    ['Let divers keep them', 'Để thợ lặn giữ', { gold: 6, stability: 3 }, 'Coastal towns prosper.', 'Các thị trấn ven biển phát đạt.'], { coast: true }),
  p('envoy', 'A foreign envoy arrives with gifts and asks for an audience.', 'Một sứ thần nước ngoài mang quà đến xin yết kiến.',
    ['Hold a grand banquet', 'Mở tiệc lớn', { gold: -12, food: -6, relations: 10 }, 'Word of your hospitality spreads.', 'Tiếng hiếu khách của ta lan xa.'],
    ['A short audience', 'Tiếp kiến ngắn gọn', { relations: -3 }, 'The envoy leaves politely, unimpressed.', 'Sứ thần lịch sự ra về, không mấy ấn tượng.']),
  p('border-stones', 'Herders quarrel with neighbours over where the border stones lie.', 'Người chăn thả cãi nhau với láng giềng về vị trí cột mốc.',
    ['Send judges', 'Cử quan xét xử', { gold: -8, relations: 6 }, 'The stones are reset fairly.', 'Cột mốc được cắm lại công bằng.'],
    ['Back our herders', 'Bênh dân ta', { stability: 3, relations: -8 }, 'Our herders cheer; neighbours fume.', 'Dân ta reo mừng; láng giềng tức giận.']),
  p('quarry', 'Masons found good marble in the hills.', 'Thợ đá tìm thấy đá cẩm thạch tốt trên đồi.',
    ['Open a quarry', 'Mở mỏ đá', { gold: -10, materials: 20 }, 'Blocks roll down to the towns.', 'Đá khối được chở về các thị trấn.'],
    ['Leave the hills wild', 'Để đồi hoang', { stability: 1 }, 'The hill folk are pleased.', 'Người miền đồi hài lòng.']),
  p('timber', 'The royal forests are being cut by poachers.', 'Rừng của triều đình bị lâm tặc đốn trộm.',
    ['Hire wardens', 'Thuê kiểm lâm', { gold: -10, materials: 6 }, 'The forests recover.', 'Rừng dần hồi phục.'],
    ['Sell cutting rights', 'Bán quyền khai thác', { gold: 15, materials: 5, stability: -2 }, 'Axes ring in every valley.', 'Tiếng rìu vang khắp các thung lũng.']),
  p('plague-rats', 'Rats are spoiling grain in the river warehouses.', 'Chuột phá hoại thóc trong kho bên sông.',
    ['Bring in cats and traps', 'Mang mèo và bẫy tới', { gold: -6, food: 4 }, 'The warehouses are clean again.', 'Kho đã sạch chuột.'],
    ['Ignore it', 'Mặc kệ', { food: -12 }, 'A quarter of the grain is lost.', 'Mất một phần tư số thóc.']),
  p('festival-lights', 'Monks propose a festival of lanterns on the longest night.', 'Các nhà sư đề xuất lễ hội đèn lồng vào đêm dài nhất năm.',
    ['Light the lanterns', 'Thắp đèn lồng', { gold: -8, stability: 6 }, 'The night glows across the realm.', 'Đêm sáng rực khắp vương quốc.'],
    ['Save the oil', 'Tiết kiệm dầu', { stability: -1 }, 'A quiet, dark night.', 'Một đêm yên ắng, tối om.'], { season: 3 }),
  p('mercenaries', 'A band of mercenaries offers its spears for a season.', 'Một nhóm lính đánh thuê xin phục vụ một mùa.',
    ['Hire them', 'Thuê họ', { gold: -20, army: 8 }, 'Hard-faced riders join the host.', 'Những kỵ binh mặt lạnh gia nhập quân đội.'],
    ['Send them off', 'Đuổi đi', { relations: -2 }, 'They ride off to sell their spears to a neighbour.', 'Họ đi bán giáo cho nước láng giềng.']),
  p('road', 'Merchants ask for a paved road between the two largest towns.', 'Thương nhân xin lát đường giữa hai thị trấn lớn nhất.',
    ['Pave the road', 'Lát đường', { materials: -20, gold: 10, stability: 2 }, 'Caravans move faster and pay more toll.', 'Đoàn buôn đi nhanh hơn và nộp thêm thuế đường.'],
    ['Dirt will do', 'Đường đất là được', {}, 'Wheels keep sinking in the mud.', 'Bánh xe vẫn lún bùn.']),
  p('census', 'Clerks want to count every household for fairer taxes.', 'Các thư lại muốn kiểm kê từng hộ để đánh thuế công bằng hơn.',
    ['Run the census', 'Kiểm kê', { gold: -8, stability: -1 }, 'Next season the tax rolls are fuller.', 'Mùa sau sổ thuế đầy đủ hơn.'],
    ['Trust the old rolls', 'Dùng sổ cũ', { gold: 4 }, 'Old errors stay on the books.', 'Sai sót cũ vẫn nằm trong sổ.']),
  p('drills', 'Captains want the levy to train through the season.', 'Các tướng muốn dân binh luyện tập suốt mùa.',
    ['Drill them hard', 'Luyện tập gắt', { food: -8, army: 4, stability: -1 }, 'The levy marches in step.', 'Dân binh hành quân đều bước.'],
    ['Let them farm', 'Cho về làm ruộng', { food: 6 }, 'Fields over drill yards.', 'Ruộng đồng thay cho thao trường.']),
  p('comet', 'A comet blazes over the capital. Astrologers ask how to read it.', 'Một sao chổi rực sáng trên kinh đô. Các nhà chiêm tinh hỏi nên luận thế nào.',
    ['A sign of greatness', 'Điềm đại cát', { stability: 5, relations: -3 }, 'Crowds cheer; neighbours watch warily.', 'Dân chúng reo hò; láng giềng dè chừng.'],
    ['Just a star', 'Chỉ là một ngôi sao', { stability: -1 }, 'The astrologers sulk.', 'Các nhà chiêm tinh hờn dỗi.']),
];
