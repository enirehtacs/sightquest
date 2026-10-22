#!/usr/bin/env python3
"""Builds supabase/seed/routes.sql from the route data below.

The routes, places and copy come from the prototype (design/prototype: Route,
Main, Collection, Search, Diary, Atlas). Owners are the seed creators from
people.sql. Run:  python3 supabase/seed/build_routes.py
Then apply routes.sql the same way as people.sql.
"""
import json
import os
import uuid

NS = uuid.UUID('5eed0001-0000-4000-a000-000000000000')
MAYA, MAI, SOL, DUSTY = (f'5eed0000-0000-4000-a000-00000000000{i}' for i in range(1, 5))


def rid(n):
    return f'5eed0001-0000-4000-a000-{n:012d}'


def uid(*parts):
    return str(uuid.uuid5(NS, '/'.join(str(p) for p in parts)))


def q(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, list):
        return "'{" + ','.join('"' + str(x).replace('"', '\\"') + '"' for x in v) + "}'"
    if isinstance(v, dict) or (isinstance(v, list) and v and isinstance(v[0], dict)):
        return "'" + json.dumps(v).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


# A day: (place, lat, lng, note, weather, [legs], [moments])
#   leg: (mode, from, to, duration, note)
#   moment: (local time 'HH:MM', TAG, caption, dlat, dlng)
# Spots: (kind, name, where, why, lat, lng)
# Must-knows: (category, chips, note) or ('custom', label, chips, note)

ROUTES = [
    dict(
        n=1, owner=MAI, title='Ha Giang, the long way', status='complete', visibility='public',
        went=(3, 2026), countries=['VN'], continent='Asia', budget=2, effort=3,
        vibes=['scenic', 'wild'], terrain=['mountains', 'rivers'], styles=['road_trip'],
        modes=['bus', 'moto', 'walk', 'boat'], offbeat='comfortable', best=[3, 4, 10, 11],
        weather='Went in March. Mostly sunny, misty mornings, cold nights up north. Go before the June rains.',
        season='COOL & CLEAR', km=480, sowo=(88, 16), saves=41, views=1290, steals=7,
        tz='Asia/Ho_Chi_Minh', dates=('2026-03-06', '2026-03-14'),
        days=[
            ('Hanoi', 21.0285, 105.8542, 'Night bus out at 9pm from My Dinh.', 'hot',
             [('bus', 'Hanoi', 'Ha Giang', '7h', 'Sleeper bus. Bring socks, the AC has a personality.')],
             [('21:40', 'TRANSPORT', 'Sleeper bus out of Hanoi. Bring socks, the AC has a personality.', 0.01, -0.01)]),
            ('Ha Giang', 22.8233, 104.9836, 'Permit, bike, pho. In that order.', 'misty',
             [('moto', 'Ha Giang', 'Quan Ba', '2h', 'Easy first ride. Heaven’s Gate for golden hour.')],
             [('06:30', 'FOOD', 'Pho on a plastic stool by the bus station. Best wake-up call there is.', -0.004, -0.006),
              ('10:00', 'RENTAL', 'Picked up the bike. The mechanic checked the brakes twice, which was reassuring and also not.', 0.004, 0.005),
              ('17:20', 'VIEWPOINT', 'Heaven’s Gate at golden hour. The twin hills below look exactly how the locals describe them.', 0.24, 0.01)]),
            ('Dong Van', 23.2789, 105.3622, 'Long day through Yen Minh. Stopped at every bend.', 'sunny',
             [('moto', 'Quan Ba', 'Dong Van', '5h', 'Fuel up in Yen Minh, the next pump is a guess.')],
             [('07:00', 'VIEWPOINT', 'Fog sat in the valley until 8. Worth getting up cold for.', -0.2, -0.36)]),
            ('Dong Van', 23.2789, 105.3622, 'Market day. Stayed put and ate everything.', 'sunny',
             [('stayed', None, None, None, 'Sunday market from 6am. Go early, leave hungry.')],
             [('08:00', 'MARKET', 'Sunday market. Bought a scarf I did not need from a woman who would not take no.', 0.003, -0.004),
              ('19:30', 'FOOD', 'Homestay dinner. Too much rice wine and a toast every four minutes.', -0.003, 0.004)]),
            ('Meo Vac', 23.1622, 105.4081, 'Ma Pi Leng day. The reason you came.', 'sunny',
             [('moto', 'Dong Van', 'Meo Vac', '2h', 'Ma Pi Leng at 7am, before the tour groups. Or hire an easy rider and just enjoy it.')],
             [('07:10', 'VIEWPOINT', 'Ma Pi Leng Pass before the tour groups. Had the whole road to myself.', 0.06, -0.01)]),
            ('Nho Que river', 23.2105, 105.4012, 'Down to the river and back up again.', 'hot',
             [('boat', 'Nho Que river', 'Tu San canyon', '2h', 'Best boat ride of the trip. Swim if the boatman says yes.')],
             [('14:00', 'BOAT', 'Boat through the canyon. Water that colour should not be legal.', -0.004, 0.004),
              ('15:10', 'SWIM', 'Jumped in. Boatman approved. Best boat ride of the trip.', 0.004, -0.003)]),
            ('Sa Phin', 23.2694, 105.2486, 'Slow day. Palace, tea, a nap.', 'cloudy',
             [('moto', 'Meo Vac', 'Sa Phin', '3h', 'The Hmong king’s house is on the way, 30 minutes is plenty.')], []),
            ('Lung Cu', 23.3639, 105.3166, 'Walked in on the ridge path.', 'misty',
             [('walk', 'Dong Van', 'Lung Cu', '1d', 'Ask the homestay auntie for the ridge path. Trust her, not the map.')],
             [('09:00', 'HIKE', 'Auntie’s ridge path. Trust her, not the map.', -0.02, -0.01)]),
            ('Lung Cu', 23.3639, 105.3166, 'Sunrise at the flag tower, then the long ride home.', 'cold',
             [('stayed', None, None, None, '389 steps up the flag tower. Go in the dark, it’s worth it.')],
             [('05:45', 'LANDMARK', 'Northernmost point. Climbed up in the dark, China on the other side of the hill.', 0.003, 0.002)]),
        ],
        spots=[
            ('food', 'Thang co stall', 'Dong Van', 'Sunday market only. Brave, but go.', 23.2796, 105.3616),
            ('viewpoint', 'Ma Pi Leng skywalk', 'Ma Pi Leng', '7am, before the tour groups.', 23.2336, 105.4069),
            ('accommodation', 'Auntie Hoa’s homestay', 'Lung Cu', 'Ask her for the ridge path.', 23.3614, 105.3201),
            ('hike', 'Du Gia waterfall', 'Yen Minh', 'About 1h each way. Swim.', 22.9325, 105.2074),
            ('cafe', 'Old Quarter coffee', 'Dong Van', 'Egg coffee by the stone houses.', 23.2783, 105.3628),
            ('culture', 'Vuong family palace', 'Sa Phin', 'Hmong king’s house. 30 min stop.', 23.2694, 105.2486),
        ],
        must=[
            ('visa', ['e-Visa'], '90 days. Apply online about a week before.'),
            ('permits', ['Buy on the spot'], 'Ha Giang permit, about 250k VND. Your homestay sorts it.'),
            ('wheels', ['IDP', 'Local licence'], 'Police checkpoints on the loop. No licence? Hire an easy rider.'),
            ('cash', ['Mostly cash'], 'ATMs in Ha Giang and Dong Van only.'),
            ('sim', ['Patchy'], 'Viettel has the best signal up north. Patchy on the passes.'),
            ('book', ['Weekends only'], 'Walk-ins fine Monday to Thursday.'),
            ('roads', ['Mixed'], 'Smooth main loop, rough near Du Gia.'),
            ('water', ['Bottled only'], 'Clinic in Dong Van, hospital in Ha Giang.'),
            ('scams', ['Watch out'], 'Fake fines at a few checkpoints. Ask for a written receipt.'),
            ('dress', ['Cover up at sacred places'], 'Ask before taking photos at Hmong markets.'),
            ('wildlife', ['Stray dogs'], 'Village dogs bark a lot. Give them space and they lose interest.'),
            ('pack', ['Waterproof layer', 'Warm layer', 'Bring snacks'], 'Nights drop to 8°. Snacks for the passes.'),
            ('custom', 'Tet holiday', ['Avoid Tet week'], 'Most homestays shut for about 5 days.'),
        ],
        tunes=dict(title='Ha Giang on two wheels', count=24, length='1h 32m',
                   note='On loop through every pass. Track 2 is Dong Van at night, I can still smell the woodsmoke.',
                   tracks=[('Mountain Switchbacks', 'The Low Passes', '3:41'), ('Rice Wine at Dusk', 'Hoa & the Mist', '4:12'), ('Northbound', 'Kite Theory', '3:05')]),
    ),
    dict(
        n=2, owner=SOL, title='Laos by slow boat', status='complete', visibility='public',
        went=(11, 2025), countries=['LA'], continent='Asia', budget=1, effort=1,
        vibes=['chill', 'social'], terrain=['rivers', 'jungle'], styles=['slow_travel'],
        modes=['boat'], offbeat='comfortable', best=[11, 12, 1, 2],
        weather='Went in November. Dry, warm days and cool mornings on the river.',
        season='DRY SEASON', km=300, sowo=(92, 11), saves=33, views=980, steals=4,
        tz='Asia/Vientiane', dates=('2025-11-12', '2025-11-14'),
        days=[
            ('Huay Xai', 20.2753, 100.4128, 'Crossed from Chiang Khong in the morning.', 'sunny',
             [('boat', 'Huay Xai', 'Pakbeng', '8h', 'Get there by 8:30 for a seat that isn’t next to the engine.')],
             [('08:15', 'SNACKS', 'Bought snacks for two days. Ate them in two hours.', 0.003, 0.002)]),
            ('Pakbeng', 19.8939, 101.1347, 'One street, two guesthouses, a lot of roosters.', 'misty',
             [('boat', 'Pakbeng', 'Luang Prabang', '9h', 'Day two is prettier. Sit on the left for the cliffs.')],
             [('04:00', 'VILLAGE', 'Overnight in a river village. Roosters at 4am.', 0.002, -0.002),
              ('15:30', 'RIVER', 'Two days on the Mekong with a deck of cards and new friends.', -0.18, 0.4)]),
            ('Luang Prabang', 19.8856, 102.1347, 'Arrived at sunset. Night market for dinner.', 'sunny',
             [('walk', 'Boat landing', 'Old town', '40m', 'Skip the tuk-tuk mafia, it’s a nice walk.')],
             [('06:00', 'MORNING', 'Alms giving at dawn, watched quietly from the side.', 0.002, 0.003)]),
        ],
        spots=[
            ('accommodation', 'Riverside guesthouse', 'Pakbeng', 'Ask for a room facing the river.', 19.8945, 101.1341),
            ('food', 'Night market buffet', 'Luang Prabang', 'One plate, pile it high.', 19.8879, 102.1352),
            ('viewpoint', 'Mount Phousi', 'Luang Prabang', 'Sunset, with everyone else. Still worth it.', 19.8917, 102.1381),
        ],
        must=[
            ('visa', ['On arrival'], 'At the Friendship Bridge. Bring USD and a photo.'),
            ('cash', ['Cash only'], 'Kip or baht on the boat. No ATM in Pakbeng.'),
            ('book', ['Walk in'], 'Buy the boat ticket at the pier the morning you go.'),
            ('pack', ['Bring snacks', 'Bring water', 'Warm layer'], 'A cushion. The benches are wood.'),
        ],
        tunes=dict(title='Mekong slow days', count=31, length='2h 05m',
                   note='Cards, a cold Beerlao, this on repeat.',
                   tracks=[('Slow Water', 'Paddy Field Radio', '4:02'), ('Pakbeng Night', 'The Roosters', '3:28'), ('Upstream', 'Lune Rouge', '5:11')]),
    ),
    dict(
        n=3, owner=MAI, title='Annapurna, no jeep', status='complete', visibility='public',
        went=(10, 2025), countries=['NP'], continent='Asia', budget=2, effort=5,
        vibes=['wild', 'scenic'], terrain=['mountains', 'snow'], styles=['hikey'],
        modes=['walk', 'bus'], offbeat='comfortable', best=[10, 11, 3, 4],
        weather='Went in October. Clear skies, freezing nights above Manang.',
        season='CLEAR SKIES', km=160, sowo=(81, 4), saves=27, views=760, steals=3,
        tz='Asia/Kathmandu', dates=('2025-10-04', '2025-10-17'),
        days=[
            ('Besisahar', 28.2297, 84.3753, 'Bus from Kathmandu, then the first tea house.', 'sunny',
             [('bus', 'Kathmandu', 'Besisahar', '7h', 'Local bus. Sit on the right for the river.')],
             [('18:30', 'FOOD', 'First tea house, first dal bhat, first of many.', 0.002, 0.002)]),
            ('Bahundanda', 28.3533, 84.4043, 'Short day to wake the legs up.', 'hot', [('walk', 'Besisahar', 'Bahundanda', '5h', 'Take the old trail, not the jeep road.')], []),
            ('Chamje', 28.4441, 84.4002, 'Waterfalls all day.', 'sunny', [('walk', 'Bahundanda', 'Chamje', '6h', None)], []),
            ('Dharapani', 28.5203, 84.3606, None, 'cloudy', [('walk', 'Chamje', 'Dharapani', '6h', None)], []),
            ('Chame', 28.5531, 84.2392, 'Hot springs by the river.', 'sunny', [('walk', 'Dharapani', 'Chame', '6h', 'Soak your feet in the spring below town.')], []),
            ('Upper Pisang', 28.6141, 84.1416, 'High route. Best views on the circuit.', 'sunny', [('walk', 'Chame', 'Upper Pisang', '5h', None)], []),
            ('Manang', 28.6667, 84.0167, 'Rest day coming.', 'cold', [('walk', 'Upper Pisang', 'Manang', '6h', 'Go via Ghyaru if your legs agree.')], []),
            ('Manang', 28.6667, 84.0167, 'Acclimatisation day.', 'sunny', [('stayed', None, None, None, 'Walk high, sleep low. Ice Lake if you’re feeling strong.')],
             [('11:00', 'REST', 'Acclimatisation day. Did nothing, proudly.', 0.002, -0.003)]),
            ('Yak Kharka', 28.7056, 83.9708, None, 'cold', [('walk', 'Manang', 'Yak Kharka', '4h', 'Slow. Slower than that.')], []),
            ('Thorong Phedi', 28.7836, 83.9562, 'Early night. Alarm at 4.', 'cold', [('walk', 'Yak Kharka', 'Thorong Phedi', '4h', None)], []),
            ('Muktinath', 28.8167, 83.8714, 'Over the pass.', 'cold', [('walk', 'Thorong Phedi', 'Muktinath', '9h', 'Start at 4am. The wind picks up after 10.')],
             [('08:40', 'SUMMIT', 'Thorong La at 5,416 m. Cried a little. Ate a lot of dal bhat.', -0.03, 0.06)]),
            ('Tatopani', 28.4833, 83.6500, 'Down, down, down. Then hot springs.', 'hot', [('bus', 'Jomsom', 'Tatopani', '6h', 'The only bus of the trip, to skip the dusty road.')], []),
            ('Ghorepani', 28.4005, 83.7006, 'Rhododendron forest all afternoon.', 'cloudy', [('walk', 'Tatopani', 'Ghorepani', '7h', '3,000 steps. Every single one is real.')], []),
            ('Pokhara', 28.2096, 83.9856, 'Poon Hill at sunrise, then the lake.', 'sunny', [('walk', 'Ghorepani', 'Nayapul', '5h', 'Poon Hill at 5am, then down to the bus.')],
             [('05:50', 'SUNRISE', 'Sunrise over Dhaulagiri with 200 strangers.', 0.19, -0.28)]),
        ],
        spots=[
            ('viewpoint', 'Thorong La', 'Thorong La pass', 'The top. 5,416 m.', 28.7942, 83.9375),
            ('hike', 'Ice Lake', 'Above Manang', 'Acclimatisation hike, 4,600 m.', 28.6833, 84.0333),
            ('viewpoint', 'Poon Hill', 'Ghorepani', 'Sunrise. Bring a head torch.', 28.4000, 83.6900),
        ],
        must=[
            ('permits', ['Book ahead'], 'ACAP permit and TIMS card from Kathmandu or Pokhara.'),
            ('water', ['Filter or boil'], 'Altitude: walk high, sleep low. Know the signs.'),
            ('pack', ['Warm layer', 'Headtorch', 'Sun protection'], 'A proper down jacket for the pass.'),
        ],
    ),
    dict(
        n=4, owner=MAI, title='Sapa back valleys', status='complete', visibility='followers',
        went=(9, 2025), countries=['VN'], continent='Asia', budget=1, effort=3,
        vibes=['scenic', 'chill'], terrain=['mountains', 'rivers'], styles=['hikey'],
        modes=['walk', 'bus'], offbeat='off_the_map', best=[9, 10],
        weather='Went in September. Harvest season, the terraces go gold.',
        season='HARVEST', km=42, sowo=None, saves=6, views=40,
        tz='Asia/Ho_Chi_Minh', dates=('2025-09-20', '2025-09-23'),
        days=[
            ('Sapa', 22.3364, 103.8438, 'Skip the town, head for the valleys.', 'misty', [('bus', 'Hanoi', 'Sapa', '6h', None)], []),
            ('Lao Chai', 22.3124, 103.8762, 'Through the terraces with a Black Hmong guide.', 'sunny', [('walk', 'Sapa', 'Lao Chai', '4h', 'Hire a guide from the village, not the agency.')],
             [('11:20', 'TERRACES', 'Gold terraces as far as you can see. Harvest week.', 0.002, 0.003)]),
            ('Ta Van', 22.3039, 103.8917, 'Homestay with a family of nine.', 'cloudy', [('walk', 'Lao Chai', 'Ta Van', '2h', None)], []),
            ('Ban Ho', 22.2536, 103.9533, 'Waterfall swim, then the bus back.', 'sunny', [('walk', 'Ta Van', 'Ban Ho', '6h', 'Long, quiet, beautiful. Pack lunch.')], []),
        ],
        spots=[('accommodation', 'Mrs Su’s homestay', 'Ta Van', 'Cooking lesson included, whether you like it or not.', 22.3039, 103.8917)],
        must=[('roads', ['Mixed'], 'Muddy after rain. Proper shoes.')],
    ),
    dict(
        n=5, owner=DUSTY, title='Pamir Highway by any truck', status='complete', visibility='public',
        went=(7, 2025), countries=['TJ', 'KG'], continent='Asia', budget=1, effort=4,
        vibes=['wild', 'scenic'], terrain=['mountains', 'desert', 'rivers'], styles=['road_trip'],
        modes=['hitch', 'walk'], offbeat='few_have_been', best=[6, 7, 8, 9],
        weather='Went in July. Hot in the valleys, snow on the passes.',
        season='SUMMER PASSES', km=1250, sowo=None, saves=19, views=210, steals=2,
        tz='Asia/Dushanbe', dates=('2025-07-01', '2025-07-14'),
        days=[
            ('Dushanbe', 38.5598, 68.7870, 'Sorted the GBAO permit, bought a hat.', 'hot', [('stayed', None, None, None, None)], []),
            ('Kalaikhum', 38.4600, 70.7900, 'Shared 4x4 along the Afghan border.', 'hot', [('hitch', 'Dushanbe', 'Kalaikhum', '12h', 'Shared jeeps leave from the east bus station.')],
             [('17:00', 'RIVER', 'Afghanistan is a stone’s throw across the Panj.', 0.01, 0.02)]),
            ('Khorog', 37.4897, 71.5531, None, 'sunny', [('hitch', 'Kalaikhum', 'Khorog', '8h', None)], []),
            ('Khorog', 37.4897, 71.5531, 'Rest day in the botanical garden.', 'sunny', [('stayed', None, None, None, None)], []),
            ('Ishkashim', 36.7270, 71.6110, 'Into the Wakhan.', 'sunny', [('hitch', 'Khorog', 'Ishkashim', '4h', None)], []),
            ('Langar', 37.0420, 72.6560, 'Petroglyphs above the village.', 'sunny', [('hitch', 'Ishkashim', 'Langar', '7h', 'A truck driver, a goat, and me.')],
             [('19:10', 'HOMESTAY', 'A truck driver, a goat, and me, sharing plov.', 0.002, 0.002)]),
            ('Langar', 37.0420, 72.6560, None, 'sunny', [('stayed', None, None, None, None)], []),
            ('Alichur', 37.7500, 73.7000, 'Over the Khargush pass.', 'cold', [('hitch', 'Langar', 'Alichur', '9h', None)], []),
            ('Murghab', 38.1700, 73.9600, 'Moon town.', 'cold', [('hitch', 'Alichur', 'Murghab', '2h', None)], []),
            ('Murghab', 38.1700, 73.9600, None, 'sunny', [('stayed', None, None, None, None)], []),
            ('Karakul', 39.0100, 73.5500, 'The lake is unreal blue.', 'cold', [('hitch', 'Murghab', 'Karakul', '4h', 'Ak-Baital pass, 4,655 m. Breathe.')],
             [('08:30', 'LAKE', 'Karakul. Unreal blue, unreal cold.', 0.01, 0.02)]),
            ('Sary-Tash', 39.7300, 73.2500, 'Into Kyrgyzstan.', 'cold', [('hitch', 'Karakul', 'Sary-Tash', '5h', None)], []),
            ('Sary-Tash', 39.7300, 73.2500, None, 'sunny', [('stayed', None, None, None, None)], []),
            ('Osh', 40.5140, 72.8160, 'Bazaar, plov, bed.', 'hot', [('hitch', 'Sary-Tash', 'Osh', '5h', None)], []),
        ],
        spots=[('culture', 'Langar petroglyphs', 'Langar', '1h climb above the village.', 37.0480, 72.6650),
               ('viewpoint', 'Ak-Baital pass', 'Murghab', 'Highest point of the highway.', 38.6200, 73.6700)],
        must=[
            ('permits', ['Book ahead'], 'GBAO permit with your e-visa.'),
            ('cash', ['Cash only'], 'Somoni and USD. No ATMs after Khorog.'),
            ('sim', ['None on parts'], 'Signal in towns only.'),
            ('wildlife', ['Nothing to worry about'], 'Yaks, marmots and the odd curious camel.'),
        ],
        tunes=dict(title='Roof of the world', count=18, length='1h 10m', note='For the long hours in the back of a truck.',
                   tracks=[('Thin Air', 'Marmot Choir', '3:55'), ('Ak-Baital', 'Dusty Strings', '4:40'), ('Plov for Three', 'Langar Lights', '3:12')]),
    ),
    dict(
        n=6, owner=DUSTY, title='Island hopping the Togeans', status='complete', visibility='public',
        went=(8, 2025), countries=['ID'], continent='Asia', budget=2, effort=2,
        vibes=['chill', 'wild'], terrain=['islands', 'beaches', 'jungle'], styles=['slow_travel'],
        modes=['boat', 'bus'], offbeat='off_the_map', best=[7, 8, 9],
        weather='Went in August. Calm seas, warm water, very few people.',
        season='CALM SEAS', km=140, sowo=(75, 8), saves=22, views=180,
        tz='Asia/Makassar', dates=('2025-08-03', '2025-08-10'),
        days=[
            ('Ampana', -0.8667, 121.5833, 'Last ATM, last cold drink for a while.', 'hot', [('bus', 'Poso', 'Ampana', '5h', None)], []),
            ('Bomba', -0.5300, 121.6300, None, 'sunny', [('boat', 'Ampana', 'Bomba', '3h', 'Public boat. Bring shade.')], []),
            ('Kadidiri', -0.3700, 121.8600, 'Hammock, snorkel, repeat.', 'sunny', [('boat', 'Bomba', 'Kadidiri', '2h', None)],
             [('10:30', 'SNORKEL', 'Jellyfish lake. They don’t sting, I checked twice.', 0.005, 0.005)]),
            ('Kadidiri', -0.3700, 121.8600, None, 'sunny', [('stayed', None, None, None, None)], []),
            ('Malenge', -0.3200, 122.0000, 'Village stay, jungle walk.', 'cloudy', [('boat', 'Kadidiri', 'Malenge', '1h', None)],
             [('16:00', 'JUNGLE', 'Hornbills overhead on the walk to the other beach.', 0.003, -0.002)]),
            ('Malenge', -0.3200, 122.0000, None, 'rainy', [('stayed', None, None, None, None)], []),
            ('Wakai', -0.4500, 121.8800, 'Market morning.', 'sunny', [('boat', 'Malenge', 'Wakai', '2h', None)], []),
            ('Ampana', -0.8667, 121.5833, 'Back to the mainland.', 'sunny', [('boat', 'Wakai', 'Ampana', '4h', None)], []),
        ],
        spots=[('beach', 'Kadidiri beach', 'Kadidiri', 'Best snorkelling off the jetty.', -0.3705, 121.8610),
               ('accommodation', 'Malenge village homestay', 'Malenge', 'Book through the boatman.', -0.3210, 122.0010)],
        must=[('cash', ['Cash only'], 'Last ATM is Ampana. Bring more than you think.'),
              ('sim', ['None on parts'], 'Telkomsel works on some islands, some of the time.'),
              ('pack', ['Bug protection', 'Sun protection', 'Headtorch'], 'Power is a few hours a night.')],
    ),
    dict(
        n=7, owner=MAYA, title='Luang Prabang loops', status='live', visibility='public', live_delay=True,
        went=(10, 2026), countries=['LA'], continent='Asia', budget=1, effort=2,
        vibes=['chill', 'scenic'], terrain=['rivers', 'jungle'], styles=['slow_travel'],
        modes=['bicycle', 'boat', 'bus'], offbeat='comfortable', best=[11, 12, 1],
        weather='Travelling in October. Showers in the afternoon, rivers running high.',
        km=None, sowo=None, saves=4, views=60, co=MAI, tz='Asia/Vientiane',
        # Live: day dates are relative to when the seed runs, the last one is "today".
        live_dates=True,
        days=[
            ('Luang Prabang', 19.8856, 102.1347, 'Bikes from the guesthouse, temples before breakfast.', 'sunny',
             [('bicycle', 'Old town', 'Mekong viewpoint', '2h', None)],
             [('06:40', 'TEMPLE', 'Wat Xieng Thong before anyone else.', 0.004, 0.003)]),
            ('Kuang Si', 19.7491, 101.9932, 'Waterfall day.', 'cloudy',
             [('day_trip', 'Luang Prabang', 'Kuang Si', '45m', 'Go at opening, it’s yours for an hour.')],
             [('08:30', 'WATERFALL', 'The blue is real. So is the cold.', 0.002, 0.002)]),
            ('Nong Khiaw', 20.5667, 102.6133, 'Up the Nam Ou.', 'rainy',
             [('bus', 'Luang Prabang', 'Nong Khiaw', '4h', None)], []),
        ],
        spots=[('viewpoint', 'Pha Daeng peak', 'Nong Khiaw', 'Sunrise hike, 1.5h up.', 20.5700, 102.6200)],
        must=[('cash', ['Mostly cash'], 'ATMs in Luang Prabang and Nong Khiaw.')],
    ),
    dict(
        n=8, owner=SOL, title='Siargao, slowly', status='complete', visibility='public',
        went=(4, 2025), countries=['PH'], continent='Asia', budget=2, effort=2,
        vibes=['chill', 'social'], terrain=['islands', 'beaches'], styles=['slow_travel'],
        modes=['moto', 'boat'], offbeat='off_the_map', best=[3, 4, 5],
        weather='Went in April. Hot, dry, glassy mornings.',
        season='DRY SEASON', km=95, sowo=(100, 6), saves=18, views=150,
        tz='Asia/Manila', dates=('2025-04-02', '2025-04-07'),
        days=[
            ('General Luna', 9.7870, 126.1570, 'Scooter rental and a slow sunset.', 'hot', [('plane', 'Manila', 'Siargao', '1h 40m', None)], []),
            ('Cloud 9', 9.8130, 126.1660, 'Watched the surfers, did not surf.', 'sunny', [('moto', 'General Luna', 'Cloud 9', '10m', None)],
             [('06:10', 'SURF', 'Cloud 9 at dawn. Glassy.', 0.001, 0.002)]),
            ('Sugba lagoon', 9.9160, 125.9530, 'Day trip by boat.', 'sunny', [('day_trip', 'Del Carmen', 'Sugba lagoon', '40m', 'Go early, the tours arrive at 10.')], []),
            ('Magpupungko', 9.8780, 126.1010, 'Rock pools at low tide.', 'sunny', [('moto', 'General Luna', 'Magpupungko', '40m', 'Check the tide chart. High tide = no pools.')],
             [('11:00', 'POOLS', 'Rock pools at low tide. Timing is everything.', 0.001, 0.001)]),
            ('Pacifico', 10.0200, 126.1300, 'Back roads north.', 'sunny', [('moto', 'Magpupungko', 'Pacifico', '50m', 'The back roads are the best part.')], []),
            ('Burgos', 10.0050, 126.0700, None, 'sunny', [('moto', 'Pacifico', 'Burgos', '20m', None)], []),
        ],
        spots=[('viewpoint', 'Coconut road', 'General Luna', 'Palm trees to the horizon.', 9.8120, 126.1220),
               ('food', 'Shaka', 'Cloud 9', 'Smoothie bowls. Yes, really.', 9.8120, 126.1650)],
        must=[('wheels', ['Not needed'], 'Scooter rental with no questions. Wear the helmet anyway.'),
              ('cash', ['Mostly cash'], 'Few ATMs, and they run out on weekends.')],
    ),
    dict(
        n=9, owner=MAYA, title='Kampong Glam to the sea', status='complete', visibility='public',
        went=(6, 2026), countries=['SG'], continent='Asia', budget=1, effort=1,
        vibes=['chill', 'foodie'], terrain=['cities', 'beaches'], styles=['citey'],
        modes=['walk'], offbeat='comfortable', best=list(range(1, 13)),
        weather='Any time. Go late afternoon so you hit the beach at sunset.',
        km=7, sowo=(100, 9), saves=12, views=320, tz='Asia/Singapore', dates=('2026-06-14', '2026-06-14'),
        days=[('Kampong Glam', 1.3022, 103.8590, 'Coffee, murals, then walk east until you hit sand.', 'hot',
               [('walk', 'Kampong Glam', 'East Coast Park', '2h 30m', 'Follow the Kallang river path, then the park connector.')],
               [('16:20', 'COFFEE', 'Kopi at a stall on Bussorah Street.', 0.0, 0.0),
                ('19:10', 'SUNSET', 'Sunset at East Coast with satay in hand.', -0.0, 0.05)])],
        spots=[('cafe', 'Bussorah Street kopi', 'Kampong Glam', 'Start here.', 1.3022, 103.8590),
               ('other', 'Kallang river path', 'Kallang', 'Shady, flat, easy.', 1.3080, 103.8710),
               ('food', 'Lagoon hawker centre', 'East Coast Park', 'Satay and a cold drink.', 1.3060, 103.9330)],
        must=[('water', ['Tap is fine'], 'Refill at any hawker centre.')],
    ),
    dict(
        n=10, owner=SOL, title='Pulau Ubin by bike', status='complete', visibility='public',
        went=(8, 2026), countries=['SG'], continent='Asia', budget=1, effort=2,
        vibes=['chill', 'wild'], terrain=['islands', 'jungle'], styles=['slow_travel'],
        modes=['bicycle', 'boat'], offbeat='comfortable', best=list(range(1, 13)),
        weather='Any time. Mornings are cooler and Chek Jawa is best at low tide.',
        km=18, sowo=None, saves=9, views=240, tz='Asia/Singapore', dates=('2026-08-02', '2026-08-02'),
        days=[('Pulau Ubin', 1.4110, 103.9570, 'Bumboat over, bike everything, bumboat back.', 'sunny',
               [('boat', 'Changi Point', 'Pulau Ubin', '10m', 'Bumboat leaves when it has 12 people. Cash only.'),
                ('bicycle', 'Ubin jetty', 'Chek Jawa', '1h', 'Rent at the jetty. Test the brakes.')],
               [('09:30', 'MANGROVE', 'Chek Jawa boardwalk at low tide. Crabs everywhere.', -0.003, 0.043)])],
        spots=[('transport', 'Changi Point ferry terminal', 'Changi', 'Bring coins.', 1.3890, 103.9870),
               ('other', 'Ubin jetty bike rental', 'Pulau Ubin', 'Pick one with gears.', 1.4110, 103.9570),
               ('viewpoint', 'Chek Jawa boardwalk', 'Pulau Ubin', 'Low tide only.', 1.4080, 104.0000)],
        must=[('cash', ['Cash only'], 'Bumboat and bikes are cash.')],
    ),
    dict(
        n=11, owner=SOL, title='Batam by ferry and bike', status='complete', visibility='public',
        went=(7, 2026), countries=['ID'], continent='Asia', budget=2, effort=2,
        vibes=['chill', 'foodie'], terrain=['islands', 'beaches'], styles=['road_trip'],
        modes=['boat', 'bicycle'], offbeat='comfortable', best=[6, 7, 8],
        weather='Went in July. Hot, a short shower at 3pm like clockwork.',
        km=35, sowo=None, saves=7, views=200, tz='Asia/Jakarta', dates=('2026-07-19', '2026-07-19'),
        days=[('Batam', 1.1280, 104.0530, 'Ferry over, cycled until the seafood called.', 'hot',
               [('boat', 'HarbourFront', 'Batam Centre', '1h', 'Bring your passport, obviously.'),
                ('bicycle', 'Batam Centre', 'Nongsa', '2h', 'Coast road. Sunscreen.')],
               [('18:20', 'SEAFOOD', 'Sunset grilled fish on the beach at Nongsa.', 0.06, 0.05)])],
        spots=[('food', 'Nongsa seafood', 'Nongsa', 'Point at the fish you want.', 1.1900, 104.1000),
               ('transport', 'Batam Centre ferry', 'Batam Centre', 'Last boat back is 9pm.', 1.1280, 104.0530)],
        must=[('visa', ['Visa-free'], 'For most passports, check before you go.')],
    ),
    dict(
        n=12, owner=MAYA, title='Penang hawker crawl', status='complete', visibility='public',
        went=(12, 2025), countries=['MY'], continent='Asia', budget=1, effort=1,
        vibes=['foodie', 'social'], terrain=['cities'], styles=['citey'],
        modes=['walk', 'bus'], offbeat='comfortable', best=[12, 1, 2],
        weather='Went in December. Warm evenings, perfect for eating outside.',
        season='COOL EVENINGS', km=12, sowo=(90, 10), saves=25, views=410, tz='Asia/Kuala_Lumpur', dates=('2025-12-12', '2025-12-13'),
        days=[('George Town', 5.4141, 100.3288, 'Breakfast to midnight snack, all on foot.', 'hot',
               [('walk', 'Chulia Street', 'Gurney Drive', '6h', 'Pace yourself. Share plates.')],
               [('08:00', 'FOOD', 'Roti canai on a plastic stool. Again.', 0.0, 0.0)]),
              ('Air Itam', 5.4006, 100.2794, 'Assam laksa, then up Penang Hill.', 'sunny',
               [('bus', 'George Town', 'Air Itam', '40m', 'Rapid Penang 204.')],
               [('12:30', 'FOOD', 'Air Itam assam laksa. Sour, spicy, perfect.', 0.0, 0.0)])],
        spots=[('food', 'Chulia Street night stalls', 'George Town', 'Wantan mee at midnight.', 5.4170, 100.3350),
               ('food', 'Air Itam laksa', 'Air Itam', 'Go before 1pm.', 5.4006, 100.2794)],
        must=[('cash', ['Mostly cash'], 'Hawkers want cash.')],
    ),
    dict(
        n=13, owner=DUSTY, title='Chiang Mai loop', status='complete', visibility='public',
        went=(11, 2025), countries=['TH'], continent='Asia', budget=1, effort=2,
        vibes=['scenic', 'chill'], terrain=['mountains', 'jungle'], styles=['road_trip'],
        modes=['moto'], offbeat='comfortable', best=[11, 12, 1],
        weather='Went in November. Clear skies, cool mornings in the hills.',
        season='CLEAR SKIES', km=600, sowo=(84, 7), saves=21, views=620, tz='Asia/Bangkok', dates=('2025-11-03', '2025-11-07'),
        days=[('Chiang Mai', 18.7883, 98.9853, 'Bike rental, then out of town by noon.', 'sunny', [('moto', 'Chiang Mai', 'Pai', '4h', '762 bends. Count them, it helps.')], []),
              ('Pai', 19.3591, 98.4413, None, 'sunny', [('stayed', None, None, None, 'Canyon at sunset with half of Pai.')],
               [('17:40', 'SUNSET', 'Pai canyon at sunset. Busy, still lovely.', -0.04, -0.01)]),
              ('Mae Hong Son', 19.3020, 97.9654, 'Lake town, very quiet.', 'misty', [('moto', 'Pai', 'Mae Hong Son', '3h', None)], []),
              ('Mae Chaem', 18.5000, 98.3600, None, 'cloudy', [('moto', 'Mae Hong Son', 'Mae Chaem', '5h', None)], []),
              ('Chiang Mai', 18.7883, 98.9853, 'Back via Doi Inthanon.', 'cold', [('moto', 'Mae Chaem', 'Chiang Mai', '4h', 'Doi Inthanon summit, coldest place in Thailand.')], [])],
        spots=[('viewpoint', 'Doi Inthanon', 'Chom Thong', 'Coldest place in Thailand. Bring a layer.', 18.5880, 98.4870)],
        must=[('wheels', ['IDP'], 'Police checks on the 1095. IDP with a motorbike stamp.')],
    ),
    dict(
        n=14, owner=MAYA, title='Bagan by e-bike', status='complete', visibility='public',
        went=(11, 2024), countries=['MM'], continent='Asia', budget=1, effort=1,
        vibes=['scenic', 'romantic'], terrain=['desert', 'rivers'], styles=['slow_travel'],
        modes=['bicycle', 'boat'], offbeat='comfortable', best=[11, 12, 1, 2],
        weather='Went in November. Cool mornings, warm afternoons.',
        season='COOL MORNINGS', km=60, sowo=None, saves=15, views=380, tz='Asia/Yangon', dates=('2024-11-08', '2024-11-11'),
        days=[('Nyaung U', 21.1960, 94.9190, 'E-bike from the guesthouse.', 'sunny', [('bicycle', 'Nyaung U', 'Old Bagan', '30m', None)], []),
              ('Old Bagan', 21.1700, 94.8600, 'Temples, temples, temples.', 'sunny', [('bicycle', 'Old Bagan', 'New Bagan', '1h', 'Dirt tracks between the temples. Go slow.')],
               [('06:10', 'SUNRISE', 'Balloons over the temples at sunrise.', 0.0, 0.0)]),
              ('New Bagan', 21.1200, 94.8800, None, 'sunny', [('stayed', None, None, None, None)], []),
              ('Irrawaddy', 21.1750, 94.8550, 'Sunset boat.', 'sunny', [('boat', 'Old Bagan', 'Irrawaddy', '1h', None)], [])],
        spots=[('viewpoint', 'Sunset mound', 'Old Bagan', 'Ask your guesthouse which ones are open.', 21.1650, 94.8650)],
        must=[('visa', ['e-Visa'], 'Check the current situation before you plan.')],
    ),
    dict(
        n=15, owner=MAI, title='Northern Laos by moto', status='complete', visibility='public',
        went=(11, 2024), countries=['LA'], continent='Asia', budget=1, effort=4,
        vibes=['scenic', 'wild'], terrain=['mountains', 'rivers', 'jungle'], styles=['road_trip'],
        modes=['moto'], offbeat='comfortable', best=[11, 12, 1, 2],
        weather='Went in November. Dry, dusty, cold first thing.',
        season='DRY SEASON', km=820, sowo=(80, 5), saves=17, views=300, tz='Asia/Vientiane', dates=('2024-11-02', '2024-11-09'),
        days=[('Luang Namtha', 20.9500, 101.4000, 'Bike from the market.', 'sunny', [('moto', 'Luang Namtha', 'Muang Sing', '1h 30m', None)], []),
              ('Muang Sing', 21.1830, 101.1500, None, 'sunny', [('stayed', None, None, None, None)], []),
              ('Oudomxay', 20.6930, 101.9860, None, 'cloudy', [('moto', 'Muang Sing', 'Oudomxay', '4h', None)], []),
              ('Nong Khiaw', 20.5667, 102.6133, 'Karst cliffs on the Nam Ou.', 'misty', [('moto', 'Oudomxay', 'Nong Khiaw', '3h', 'The road drops into the valley. Brakes!')],
               [('07:30', 'VIEWPOINT', 'Mist in the valley from the bridge.', 0.0, 0.0)]),
              ('Nong Khiaw', 20.5667, 102.6133, None, 'sunny', [('stayed', None, None, None, None)], []),
              ('Phonsavan', 19.4500, 103.2200, 'Plain of Jars.', 'cold', [('moto', 'Nong Khiaw', 'Phonsavan', '7h', 'Long one. Leave early.')], []),
              ('Vang Vieng', 18.9235, 102.4478, None, 'sunny', [('moto', 'Phonsavan', 'Vang Vieng', '6h', None)], []),
              ('Vientiane', 17.9757, 102.6331, 'Handed the bike back.', 'hot', [('moto', 'Vang Vieng', 'Vientiane', '3h', None)], [])],
        spots=[('culture', 'Plain of Jars site 1', 'Phonsavan', 'Stay on the marked paths.', 19.4300, 103.1500)],
        must=[('roads', ['Rough'], 'Potholes after Oudomxay. Leave room to brake.')],
    ),
    dict(
        n=16, owner=MAI, title='Mu Cang Chai rice terraces', status='complete', visibility='public',
        went=(9, 2026), countries=['VN'], continent='Asia', budget=2, effort=3,
        vibes=['scenic'], terrain=['mountains'], styles=['road_trip'],
        modes=['moto', 'bus'], offbeat='comfortable', best=[9, 10],
        weather='Went in September. Harvest week, gold everywhere.',
        season='HARVEST', km=360, sowo=(86, 7), saves=14, views=260, tz='Asia/Ho_Chi_Minh', dates=('2026-09-14', '2026-09-19'),
        days=[('Nghia Lo', 21.6000, 104.5100, None, 'sunny', [('bus', 'Hanoi', 'Nghia Lo', '5h', None)], []),
              ('Tu Le', 21.8000, 104.3100, 'Sticky rice and hot springs.', 'sunny', [('moto', 'Nghia Lo', 'Tu Le', '2h', None)], []),
              ('Khau Pha pass', 21.7800, 104.2500, 'Paragliders over the terraces.', 'sunny', [('moto', 'Tu Le', 'Khau Pha pass', '1h', 'Pull over at the top, everyone does.')],
               [('10:10', 'VIEWPOINT', 'Khau Pha pass, paragliders over the gold.', 0.0, 0.0)]),
              ('Mu Cang Chai', 21.8500, 104.0800, None, 'cloudy', [('moto', 'Khau Pha pass', 'Mu Cang Chai', '1h', None)], []),
              ('La Pan Tan', 21.8700, 104.1500, 'The terraces from the postcards.', 'sunny', [('moto', 'Mu Cang Chai', 'La Pan Tan', '40m', None)], []),
              ('Tram Tau', 21.4700, 104.3800, None, 'misty', [('moto', 'La Pan Tan', 'Tram Tau', '3h', None)], [])],
        spots=[('viewpoint', 'Mam Xoi hill', 'La Pan Tan', 'The sticky-rice-shaped hill.', 21.8720, 104.1510)],
        must=[('book', ['Weekends only'], 'Harvest weekends fill up. Book a homestay.')],
    ),
    dict(
        n=17, owner=MAYA, title='Tasmania in a campervan', status='draft', visibility='private',
        went=(2, 2027), countries=['AU'], continent='Oceania', budget=3, effort=2,
        vibes=['scenic', 'wild'], terrain=['mountains', 'beaches'], styles=['road_trip'],
        modes=['walk'], offbeat='comfortable', best=[1, 2, 3],
        weather=None, km=None, sowo=None, saves=0, views=0, tz='Australia/Hobart',
        days=[('Hobart', -42.8821, 147.3272, 'Pick up the van.', None, [], []),
              ('Freycinet', -42.1300, 148.3000, 'Wineglass Bay.', None, [], [])],
        spots=[], must=[],
    ),
]


def build():
    out = [
        '-- Development seed: routes from the prototype, owned by the seed creators.',
        '-- Generated by supabase/seed/build_routes.py. Do not edit by hand.',
        '-- Needs people.sql first. Safe to re-run: it replaces the seed routes',
        '-- (and anything that points at them, like saves of these routes).',
        '',
        "delete from public.routes where id::text like '5eed0001-%';",
        '',
    ]
    for r in ROUTES:
        n = r['n']
        route_id = rid(n)
        slug = ''.join(ch if ch.isalnum() else '-' for ch in r['title'].lower()).strip('-')
        while '--' in slug:
            slug = slug.replace('--', '-')
        sowo = r.get('sowo')
        dates = r.get('dates')
        cols = dict(
            id=route_id, owner_id=r['owner'], title=r['title'], slug=slug, status=r['status'],
            visibility=r['visibility'], live_delay=r.get('live_delay', False), timezone=r['tz'],
            went_month=r['went'][0], went_year=r['went'][1], country_codes=r['countries'],
            continent=r['continent'], budget=r['budget'], effort=r['effort'], vibes=r['vibes'],
            terrain=r['terrain'], styles=r['styles'], modes=r['modes'], offbeat=r['offbeat'],
            best_months=r['best'], weather_note=r.get('weather'), season_note=r.get('season'),
            save_count=r.get('saves', 0), view_count=r.get('views', 0), steal_count=r.get('steals', 0),
            distance_km=r.get('km'), sowo_score=sowo[0] if sowo else None, sowo_count=sowo[1] if sowo else 0,
        )
        names = ', '.join(cols)
        vals = ', '.join(q(v) for v in cols.values())
        start = f"'{dates[0]}'" if dates else ('current_date - ' + str(len(r['days']) - 1) if r.get('live_dates') else 'null')
        end = f"'{dates[1]}'" if dates else ('current_date' if r.get('live_dates') else 'null')
        out.append(f'-- {n}. {r["title"]}')
        out.append(f'insert into public.routes ({names}, start_date, end_date, created_at)')
        out.append(f"values ({vals}, {start}, {end}, now() - interval '{(17 - n) * 9} days');")
        if r.get('co'):
            out.append(f"insert into public.route_builders (route_id, user_id, role, status) values ({q(route_id)}, {q(r['co'])}, 'co', 'accepted');")

        ndays = len(r['days'])
        for i, (place, lat, lng, note, weather, legs, moments) in enumerate(r['days'], start=1):
            day_id = uid(n, 'day', i)
            if r.get('live_dates'):
                date = f'current_date - {ndays - i}'
            elif dates:
                date = f"date '{dates[0]}' + {i - 1}"
            else:
                date = 'null'
            out.append(
                'insert into public.days (id, route_id, day_number, date, place_name, lat, lng, weather, note, created_by) values '
                f'({q(day_id)}, {q(route_id)}, {i}, {date}, {q(place)}, {lat}, {lng}, {q(weather)}, {q(note)}, {q(r["owner"])});'
            )
            for j, (mode, frm, to, dur, lnote) in enumerate(legs):
                out.append(
                    'insert into public.legs (id, day_id, sort, mode, from_name, to_name, duration_text, note) values '
                    f'({q(uid(n, "leg", i, j))}, {q(day_id)}, {j}, {q(mode)}, {q(frm)}, {q(to)}, {q(dur)}, {q(lnote)});'
                )
            for j, (t, tag, cap, dlat, dlng) in enumerate(moments):
                out.append(
                    'insert into public.moments (id, day_id, route_id, caption, tag, local_time, lat, lng, starred, moderation) values '
                    f"({q(uid(n, 'moment', i, j))}, {q(day_id)}, {q(route_id)}, {q(cap)}, {q(tag)}, '{t}', "
                    f"{round(lat + dlat, 5)}, {round(lng + dlng, 5)}, {q(j == 0)}, 'ok');"
                )
        for j, (kind, name, where, why, lat, lng) in enumerate(r['spots']):
            out.append(
                'insert into public.spots (id, route_id, sort, name, kind, why, where_name, lat, lng) values '
                f'({q(uid(n, "spot", j))}, {q(route_id)}, {j}, {q(name)}, {q(kind)}, {q(why)}, {q(where)}, {lat}, {lng});'
            )
        for j, mk in enumerate(r['must']):
            if mk[0] == 'custom':
                cat, label, chips, note = mk
            else:
                (cat, chips, note), label = mk, None
            out.append(
                'insert into public.must_knows (id, route_id, category, custom_label, chips, note, sort) values '
                f'({q(uid(n, "must", j))}, {q(route_id)}, {q(cat)}, {q(label)}, {q(chips)}, {q(note)}, {j});'
            )
        if r.get('tunes'):
            t = r['tunes']
            tracks = [dict(title=a, artist=b, length=c) for a, b, c in t['tracks']]
            url = 'https://open.spotify.com/search/' + t['title'].replace(' ', '%20')
            out.append(
                'insert into public.trip_tunes (route_id, kind, spotify_url, title, track_count, duration_text, note, preview_tracks) values '
                f"({q(route_id)}, 'playlist', {q(url)}, {q(t['title'])}, {t['count']}, {q(t['length'])}, {q(t['note'])}, "
                "'" + json.dumps(tracks).replace("'", "''") + "'::jsonb);"
            )
        out.append('')

    # Seed creators save each other's routes (keeps "Recommended" interesting).
    out.append('-- A few saves between the seed creators. (save_count above already includes them.)')
    out.append('alter table public.saves disable trigger saves_bump_count;')
    for user, n, lst in [(MAYA, 1, 'next_trip'), (MAYA, 5, 'someday'), (MAYA, 6, 'next_trip'), (MAYA, 2, 'someday'),
                         (SOL, 1, 'next_trip'), (DUSTY, 3, 'someday'), (MAI, 8, 'someday')]:
        out.append(f"insert into public.saves (user_id, route_id, list) values ({q(user)}, {q(rid(n))}, '{lst}') on conflict do nothing;")
    out.append('alter table public.saves enable trigger saves_bump_count;')
    out.append('')
    return '\n'.join(out)


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'routes.sql'), 'w') as f:
        f.write(build())
    print('wrote routes.sql')
