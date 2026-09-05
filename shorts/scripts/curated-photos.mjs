// Source pages and Pexels license checked 2026-09-05. These are contextual stock
// illustrations, not photographs of the author or the events in the narration.
export function curatedPhoto(query) {
  let entry;
  if (/tired|friction|conflict|empty.*(office|room)|회의실/i.test(query)) {
    entry = [17739892, '빈 회의실의 테이블과 의자', 'Aheed Baithul Nafia', 'conference-table-and-chairs-in-an-empty-office-17739892'];
  } else if (/developer|coding|programming|frontend|software|code|개발/i.test(query)) {
    entry = [574071, '노트북에서 코드를 작성하는 손', 'Lukas Blazek', 'person-encoding-in-laptop-574071'];
  } else if (/team|collaborat|meeting|whiteboard|협업/i.test(query)) {
    entry = [3184357, '컴퓨터 앞에서 함께 일하는 팀', 'fauxels', 'people-working-in-front-of-the-computer-3184357'];
  }
  if (!entry) return null;
  const [id, title, creator, slug] = entry;
  const url = id === 17739892
    ? 'https://images.pexels.com/photos/17739892/pexels-photo-17739892/free-photo-of-conference-table-and-chairs-in-an-empty-office.jpeg'
    : `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;
  return {query, title, creator, license: 'pexels', licenseVersion: null,
    licenseUrl: 'https://www.pexels.com/license/', source: 'pexels', provider: 'pexels',
    sourcePage: `https://www.pexels.com/photo/${slug}/`,
    originalUrl: `${url}?auto=compress&cs=tinysrgb&w=1600`,
    thumbnailUrl: `${url}?auto=compress&cs=tinysrgb&w=1000`};
}
