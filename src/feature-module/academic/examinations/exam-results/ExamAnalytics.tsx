
import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, Select, Typography, Statistic, Table, Tag, Tabs } from 'antd';
import { BarChartOutlined, PieChartOutlined, UserOutlined, TeamOutlined, BookOutlined, RiseOutlined, FallOutlined, TrophyOutlined, ReadOutlined, SolutionOutlined } from '@ant-design/icons';
import { Bar, Pie, Column, Liquid } from '@ant-design/charts';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// --- MOCK DATA ---
const mockApiData = {
  summary: {
    averageScore: 78.5,
    passRate: 89.2,
    totalStudents: 150,
    gradeDistribution: [
      { type: 'A (80-100)', value: 30 },
      { type: 'B (65-79)', value: 65 },
      { type: 'C (50-64)', value: 40 },
      { type: 'D (40-49)', value: 10 },
      { type: 'F (0-39)', value: 5 },
    ],
  },
  performanceByClass: [
    { className: 'Grade 7A', averageScore: 85.1 },
    { className: 'Grade 7B', averageScore: 79.8 },
    { className: 'Grade 8A', averageScore: 72.4 },
    { className: 'Grade 8B', averageScore: 75.0 },
    { className: 'Grade 9', averageScore: 68.5 },
  ],
  performanceBySection: [
      { sectionName: 'Junior Secondary', averageScore: 78.2 },
      { sectionName: 'Senior Secondary', averageScore: 72.9 },
  ],
  performanceBySubject: [
    { subject: 'Mathematics', averageScore: 75.9 },
    { subject: 'English Language', averageScore: 82.3 },
    { subject: 'Basic Science', averageScore: 79.1 },
    { subject: 'Social Studies', averageScore: 81.0 },
    { subject: 'Computer Science', averageScore: 88.2 },
  ],
  subjectPerformanceByClass: [
      { subject: 'Mathematics', className: 'Grade 7A', averageScore: 89 },
      { subject: 'Mathematics', className: 'Grade 7B', averageScore: 81 },
      { subject: 'Mathematics', className: 'Grade 8A', averageScore: 75 },
      { subject: 'English Language', className: 'Grade 7A', averageScore: 85 },
      { subject: 'English Language', className: 'Grade 7B', averageScore: 90 },
      { subject: 'English Language', className: 'Grade 8A', averageScore: 78 },
  ],
  performanceByGender: [
    { subject: 'Mathematics', gender: 'Male', averageScore: 76.5 },
    { subject: 'Mathematics', gender: 'Female', averageScore: 75.3 },
    { subject: 'English Language', gender: 'Male', averageScore: 80.1 },
    { subject: 'English Language', gender: 'Female', averageScore: 84.5 },
    { subject: 'Basic Science', gender: 'Male', averageScore: 80.0 },
    { subject: 'Basic Science', gender: 'Female', averageScore: 78.2 },
  ],
  topStudents: [
    { studentName: 'Alice Johnson', class: 'Grade 7A', averageScore: 94.5 },
    { studentName: 'Bob Williams', class: 'Grade 7B', averageScore: 92.1 },
    { studentName: 'Zoe Brown', class: 'Grade 9', averageScore: 91.8 },
  ],
  studentsToWatch: [
    { studentName: 'Charlie Brown', class: 'Grade 8A', averageScore: 58.2 },
    { studentName: 'Diana Miller', class: 'Grade 7A', averageScore: 61.7 },
    { studentName: 'Frank White', class: 'Grade 8B', averageScore: 63.5 },
  ],
  performanceByTeacher: [
    { key: '1', teacherName: 'Mr. John Smith', subject: 'Mathematics', className: 'Grade 7A', teacherAverage: 88.0, classAverage: 85.1 },
    { key: '2', teacherName: 'Mr. John Smith', subject: 'Mathematics', className: 'Grade 7B', teacherAverage: 82.0, classAverage: 79.8 },
    { key: '3', teacherName: 'Mrs. Jane Doe', subject: 'English Language', className: 'Grade 8A', teacherAverage: 70.5, classAverage: 72.4 },
    { key: '4', teacherName: 'Mrs. Jane Doe', subject: 'English Language', className: 'Grade 8B', teacherAverage: 78.0, classAverage: 75.0 },
    { key: '5', teacherName: 'Mr. Peter Pan', subject: 'Basic Science', className: 'Grade 9', teacherAverage: 65.0, classAverage: 68.5 },
  ],
  filterOptions: {
      branches: [{id: 'B1', name: 'Main Campus'}, {id: 'B2', name: 'Annex Campus'}],
      sections: [{id: 'S1', name: 'Junior Secondary'}, {id: 'S2', name: 'Senior Secondary'}],
      classes: [{id: 'C1', name: 'Grade 7A'}, {id: 'C2', name: 'Grade 7B'}, {id: 'C3', name: 'Grade 8A'}],
      teachers: [{ id: '1', name: 'Mr. John Smith' }, { id: '2', name: 'Mrs. Jane Doe' }, { id: '3', name: 'Mr. Peter Pan' }],
  }
};

// --- COMPONENTS ---

const PageTitle = () => (
  <div className="mb-8">
    <Title level={2} className="text-3xl font-bold text-gray-800">Exam Performance Analysis</Title>
    <Text className="text-lg text-gray-500">Deep dive into academic performance across the school.</Text>
  </div>
);

const Filters = ({ filters, setFilters, options }: { filters: any, setFilters: any, options: any }) => (
  <Card className="mb-6 shadow-sm">
    <Row gutter={[16, 16]} align="bottom">
      <Col xs={24} sm={12} md={6} lg={4}><Text>Academic Year</Text><Select value={filters.academicYear} onChange={(value) => setFilters({...filters, academicYear: value})} style={{ width: '100%' }} size="large"><Option value="2024/2025">2024/2025</Option></Select></Col>
      <Col xs={24} sm={12} md={6} lg={4}><Text>Term</Text><Select value={filters.term} onChange={(value) => setFilters({...filters, term: value})} style={{ width: '100%' }} size="large"><Option value="Third Term">Third Term</Option></Select></Col>
      <Col xs={24} sm={12} md={6} lg={4}><Text>Branch</Text><Select value={filters.branch} onChange={(value) => setFilters({...filters, branch: value})} style={{ width: '100%' }} size="large"><Option value="All">All Branches</Option>{options.branches.map((b:any) => <Option key={b.id} value={b.id}>{b.name}</Option>)}</Select></Col>
      <Col xs={24} sm={12} md={6} lg={4}><Text>Section</Text><Select value={filters.section} onChange={(value) => setFilters({...filters, section: value})} style={{ width: '100%' }} size="large"><Option value="All">All Sections</Option>{options.sections.map((s:any) => <Option key={s.id} value={s.id}>{s.name}</Option>)}</Select></Col>
      <Col xs={24} sm={12} md={6} lg={4}><Text>Class</Text><Select value={filters.class} onChange={(value) => setFilters({...filters, class: value})} style={{ width: '100%' }} size="large"><Option value="All">All Classes</Option>{options.classes.map((c:any) => <Option key={c.id} value={c.id}>{c.name}</Option>)}</Select></Col>
      <Col xs={24} sm={12} md={6} lg={4}><Text>Teacher</Text><Select value={filters.teacher} onChange={(value) => setFilters({...filters, teacher: value})} style={{ width: '100%' }} size="large"><Option value="All">All Teachers</Option>{options.teachers.map((t:any) => <Option key={t.id} value={t.id}>{t.name}</Option>)}</Select></Col>
    </Row>
  </Card>
);

const SummaryWidgets = ({ data }: { data: typeof mockApiData.summary }) => (
    <Row gutter={[24, 24]} className="mb-6">
        <Col xs={24} sm={12} md={6}><Card className="shadow-sm text-center"><Liquid height={120} percent={data.averageScore / 100} outline={{ border: 4, distance: 4, style: { stroke: '#c7e6ff' } }} wave={{ length: 128 }} statistic={{ title: { formatter: () => 'Overall Average', style: { fill: '#666', fontSize: '14px' }, }, content: { style: { fill: '#333', fontSize: '24px', fontWeight: 'bold' }, } }} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card className="shadow-sm"><Statistic title="Pass Rate" value={data.passRate} precision={1} valueStyle={{ color: '#3f8600', fontSize: '2rem' }} prefix={<RiseOutlined />} suffix="%" /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card className="shadow-sm"><Statistic title="Total Students" value={data.totalStudents} valueStyle={{ color: '#333', fontSize: '2rem' }} prefix={<TeamOutlined />} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card className="shadow-sm"><Title level={5} className="text-center mb-4">Grade Distribution</Title><Pie data={data.gradeDistribution} angleField="value" colorField="type" radius={0.8} height={120} legend={false} label={{ type: 'inner', offset: '-30%', content: ({ percent }) => `${(percent * 100).toFixed(0)}%`, style: { fontSize: 12, textAlign: 'center', fill: '#fff' }, }} interactions={[{ type: 'element-active' }]} /></Card></Col>
    </Row>
);

const PerformanceBySectionChart = ({ data }: { data: typeof mockApiData.performanceBySection }) => (
    <Card title={<><BarChartOutlined className="mr-2" />Performance by Section</>} className="shadow-sm">
        <Column data={data} xField="sectionName" yField="averageScore" seriesField="sectionName" height={300} yAxis={{ title: { text: 'Average Score' }, min: 0, max: 100 }} tooltip={{ formatter: (datum) => ({ name: 'Avg. Score', value: `${datum.averageScore.toFixed(1)}%` }), }} />
    </Card>
);

const PerformanceByClassChart = ({ data }: { data: typeof mockApiData.performanceByClass }) => (
  <Card title={<><BarChartOutlined className="mr-2" />Performance by Class</>} className="shadow-sm">
    <Column data={data} xField="className" yField="averageScore" seriesField="className" height={300} legend={{ position: 'top-left' }} yAxis={{ title: { text: 'Average Score' }, min: 0, max: 100 }} tooltip={{ formatter: (datum) => ({ name: 'Avg. Score', value: `${datum.averageScore.toFixed(1)}%` }), }} />
  </Card>
);

const PerformanceBySubjectChart = ({ data }: { data: typeof mockApiData.performanceBySubject }) => (
  <Card title={<><BookOutlined className="mr-2" />Performance by Subject</>} className="shadow-sm">
    <Bar data={data} xField="averageScore" yField="subject" seriesField="subject" height={300} legend={false} xAxis={{ title: { text: 'Average Score' }, min: 0, max: 100 }} tooltip={{ formatter: (datum) => ({ name: datum.subject, value: `${datum.averageScore.toFixed(1)}%` }), }} />
  </Card>
);

const SubjectPerformanceByClassChart = ({ data }: { data: typeof mockApiData.subjectPerformanceByClass }) => (
    <Card title={<><ReadOutlined className="mr-2" />Subject Performance Across Classes</>} className="shadow-sm">
        <Column data={data} isGroup={true} xField="subject" yField="averageScore" seriesField="className" height={300} dodgePadding={2} yAxis={{ title: { text: 'Average Score' }, min: 0, max: 100 }} tooltip={{ formatter: (datum) => ({ name: datum.className, value: `${datum.averageScore.toFixed(1)}%` }), }} />
    </Card>
);

const PerformanceByTeacherTable = ({ data }: { data: typeof mockApiData.performanceByTeacher }) => {
    const columns = [
        { title: 'Teacher', dataIndex: 'teacherName', key: 'teacherName', render: (text: string) => <Text strong>{text}</Text> },
        { title: 'Subject', dataIndex: 'subject', key: 'subject' },
        { title: 'Class', dataIndex: 'className', key: 'className' },
        { title: 'Teacher\'s Avg.', dataIndex: 'teacherAverage', key: 'teacherAverage', align: 'right' as const, render: (score: number) => <Tag color="blue">{score.toFixed(1)}%</Tag> },
        { title: 'Class Avg.', dataIndex: 'classAverage', key: 'classAverage', align: 'right' as const, render: (score: number) => `${score.toFixed(1)}%` },
        { title: 'Performance', key: 'performance', align: 'center' as const, render: (_: any, record: any) => { const difference = record.teacherAverage - record.classAverage; if (difference > 2) { return <Tag color="green" icon={<RiseOutlined />}>Above Average</Tag>; } else if (difference < -2) { return <Tag color="red" icon={<FallOutlined />}>Below Average</Tag>; } else { return <Tag color="default">On Par</Tag>; } } },
    ];
    return <Card title={<><TrophyOutlined className="mr-2" />Performance by Teacher</>} className="shadow-sm"><Table columns={columns} dataSource={data} pagination={false} /></Card>;
};

const StudentLists = ({ top, watch }: { top: typeof mockApiData.topStudents, watch: typeof mockApiData.studentsToWatch }) => (
  <Row gutter={[24, 24]}>
    <Col xs={24} md={12}><Card title={<><RiseOutlined className="mr-2 text-green-500" />Top Performers</>} className="shadow-sm">{top.map((student, i) => (<div key={i} className="flex justify-between items-center py-2 border-b last:border-b-0"><div><Text strong>{student.studentName}</Text><Text type="secondary" className="ml-2">{student.class}</Text></div><Text strong className="text-green-500">{student.averageScore.toFixed(1)}%</Text></div>))}</Card></Col>
    <Col xs={24} md={12}><Card title={<><FallOutlined className="mr-2 text-red-500" />Students to Watch</>} className="shadow-sm">{watch.map((student, i) => (<div key={i} className="flex justify-between items-center py-2 border-b last:border-b-0"><div><Text strong>{student.studentName}</Text><Text type="secondary" className="ml-2">{student.class}</Text></div><Text strong className="text-red-500">{student.averageScore.toFixed(1)}%</Text></div>))}</Card></Col>
  </Row>
);

const ExamAnalytics = () => {
  const [data, setData] = useState(mockApiData);
  const [filters, setFilters] = useState({
      academicYear: '2024/2025',
      term: 'Third Term',
      branch: 'All',
      section: 'All',
      class: 'All',
      teacher: 'All',
  });

  useEffect(() => {
    console.log("Filters changed, fetching new data:", filters);
    setData(mockApiData);
  }, [filters]);

  return (
    <div className="page-wrapper">
      <div className="content">
        <Layout className="min-h-screen bg-gray-50">
          <Content className="p-6 mt-4">
            <PageTitle />
            <Filters filters={filters} setFilters={setFilters} options={data.filterOptions} />
            <SummaryWidgets data={data.summary} />
            <Card>
                <Tabs defaultActiveKey="1">
                    <TabPane tab={<span className="flex items-center"><BarChartOutlined /> Overall Analysis</span>} key="1">
                        <Row gutter={[24, 24]} className="mt-6">
                            <Col xs={24} lg={12}><PerformanceBySectionChart data={data.performanceBySection} /></Col>
                            <Col xs={24} lg={12}><PerformanceByClassChart data={data.performanceByClass} /></Col>
                        </Row>
                    </TabPane>
                    <TabPane tab={<span className="flex items-center"><ReadOutlined /> Subject Analysis</span>} key="2">
                        <Row gutter={[24, 24]} className="mt-6">
                            <Col xs={24} lg={12}><PerformanceBySubjectChart data={data.performanceBySubject} /></Col>
                            <Col xs={24} lg={12}><SubjectPerformanceByClassChart data={data.subjectPerformanceByClass} /></Col>
                        </Row>
                    </TabPane>
                    <TabPane tab={<span className="flex items-center"><SolutionOutlined /> People Analysis</span>} key="3">
                        <Row gutter={[24, 24]} className="mt-6">
                            <Col span={24}><PerformanceByTeacherTable data={data.performanceByTeacher} /></Col>
                        </Row>
                        <Row gutter={[24, 24]} className="mt-6">
                            <Col span={24}><StudentLists top={data.topStudents} watch={data.studentsToWatch} /></Col>
                        </Row>
                    </TabPane>
                </Tabs>
            </Card>
          </Content>
        </Layout>
      </div>
    </div>
  );
};

export default ExamAnalytics;
