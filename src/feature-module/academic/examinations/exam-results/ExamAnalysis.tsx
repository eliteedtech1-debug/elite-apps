
import React, { useState } from 'react';
import { Layout, Card, Row, Col, Select, Typography, Statistic } from 'antd';
import { BarChartOutlined, PieChartOutlined, UserOutlined, TeamOutlined, BookOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { Bar, Pie, Column, Liquid } from '@ant-design/charts';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

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
  performanceBySubject: [
    { subject: 'Mathematics', averageScore: 75.9 },
    { subject: 'English Language', averageScore: 82.3 },
    { subject: 'Basic Science', averageScore: 79.1 },
    { subject: 'Social Studies', averageScore: 81.0 },
    { subject: 'Computer Science', averageScore: 88.2 },
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
};

// --- COMPONENTS ---

const PageTitle = () => (
  <div className="mb-8">
    <Title level={2} className="text-3xl font-bold text-gray-800">Exam Performance Analysis</Title>
    <Text className="text-lg text-gray-500">Deep dive into academic performance across the school.</Text>
  </div>
);

const Filters = () => (
  <Card className="mb-6 shadow-sm">
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Select defaultValue="2024/2025" style={{ width: '100%' }} size="large">
          <Option value="2024/2025">2024/2025</Option>
        </Select>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Select defaultValue="Third Term" style={{ width: '100%' }} size="large">
          <Option value="Third Term">Third Term</Option>
        </Select>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Select defaultValue="All Sections" style={{ width: '100%' }} size="large">
          <Option value="All Sections">All Sections</Option>
        </Select>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Select defaultValue="All Classes" style={{ width: '100%' }} size="large">
          <Option value="All Classes">All Classes</Option>
        </Select>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Select defaultValue="All Subjects" style={{ width: '100%' }} size="large">
          <Option value="All Subjects">All Subjects</Option>
        </Select>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Select defaultValue="All Genders" style={{ width: '100%' }} size="large">
          <Option value="All Genders">All Genders</Option>
        </Select>
      </Col>
    </Row>
  </Card>
);

const SummaryWidgets = ({ data }: { data: typeof mockApiData.summary }) => (
  <Row gutter={[24, 24]} className="mb-6">
    <Col xs={24} sm={12} md={6}>
      <Card className="shadow-sm text-center">
        <Liquid
          height={120}
          percent={data.averageScore / 100}
          outline={{ border: 4, distance: 4, style: { stroke: '#c7e6ff' } }}
          wave={{ length: 128 }}
          statistic={{
            title: {
              formatter: () => 'Overall Average',
              style: { fill: '#666', fontSize: '14px' },
            },
            content: {
              style: { fill: '#333', fontSize: '24px', fontWeight: 'bold' },
            }
          }}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={6}>
      <Card className="shadow-sm">
        <Statistic
          title="Pass Rate"
          value={data.passRate}
          precision={1}
          valueStyle={{ color: '#3f8600', fontSize: '2rem' }}
          prefix={<RiseOutlined />}
          suffix="%"
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={6}>
      <Card className="shadow-sm">
        <Statistic
          title="Total Students"
          value={data.totalStudents}
          valueStyle={{ color: '#333', fontSize: '2rem' }}
          prefix={<TeamOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={6}>
      <Card className="shadow-sm">
        <Title level={5} className="text-center mb-4">Grade Distribution</Title>
        <Pie
          data={data.gradeDistribution}
          angleField="value"
          colorField="type"
          radius={0.8}
          height={120}
          legend={false}
          label={{
            type: 'inner',
            offset: '-30%',
            content: ({ percent }) => `${(percent * 100).toFixed(0)}%`,
            style: { fontSize: 12, textAlign: 'center', fill: '#fff' },
          }}
          interactions={[{ type: 'element-active' }]}
        />
      </Card>
    </Col>
  </Row>
);

const PerformanceByClassChart = ({ data }: { data: typeof mockApiData.performanceByClass }) => (
  <Card title={<><BarChartOutlined className="mr-2" />Performance by Class</>} className="shadow-sm">
    <Column
      data={data}
      xField="className"
      yField="averageScore"
      seriesField="className"
      height={300}
      legend={{ position: 'top-left' }}
      yAxis={{
        title: { text: 'Average Score' },
        min: 0,
        max: 100
      }}
      tooltip={{
        formatter: (datum) => ({ name: 'Avg. Score', value: `${datum.averageScore.toFixed(1)}%` }),
      }}
    />
  </Card>
);

const PerformanceBySubjectChart = ({ data }: { data: typeof mockApiData.performanceBySubject }) => (
  <Card title={<><BookOutlined className="mr-2" />Performance by Subject</>} className="shadow-sm">
    <Bar
      data={data}
      xField="averageScore"
      yField="subject"
      seriesField="subject"
      height={300}
      legend={false}
      xAxis={{
        title: { text: 'Average Score' },
        min: 0,
        max: 100
      }}
      tooltip={{
        formatter: (datum) => ({ name: datum.subject, value: `${datum.averageScore.toFixed(1)}%` }),
      }}
    />
  </Card>
);

const PerformanceByGenderChart = ({ data }: { data: typeof mockApiData.performanceByGender }) => (
  <Card title={<><UserOutlined className="mr-2" />Performance by Gender</>} className="shadow-sm">
    <Column
      data={data}
      isGroup={true}
      xField="subject"
      yField="averageScore"
      seriesField="gender"
      height={300}
      dodgePadding={2}
      yAxis={{
        title: { text: 'Average Score' },
        min: 0,
        max: 100
      }}
      tooltip={{
        formatter: (datum) => ({ name: datum.gender, value: `${datum.averageScore.toFixed(1)}%` }),
      }}
    />
  </Card>
);

const StudentLists = ({ top, watch }: { top: typeof mockApiData.topStudents, watch: typeof mockApiData.studentsToWatch }) => (
  <Row gutter={[24, 24]}>
    <Col xs={24} md={12}>
      <Card title={<><RiseOutlined className="mr-2 text-green-500" />Top Performers</>} className="shadow-sm">
        {top.map((student, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b last:border-b-0">
            <div>
              <Text strong>{student.studentName}</Text>
              <Text type="secondary" className="ml-2">{student.class}</Text>
            </div>
            <Text strong className="text-green-500">{student.averageScore.toFixed(1)}%</Text>
          </div>
        ))}
      </Card>
    </Col>
    <Col xs={24} md={12}>
      <Card title={<><FallOutlined className="mr-2 text-red-500" />Students to Watch</>} className="shadow-sm">
        {watch.map((student, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b last:border-b-0">
            <div>
              <Text strong>{student.studentName}</Text>
              <Text type="secondary" className="ml-2">{student.class}</Text>
            </div>
            <Text strong className="text-red-500">{student.averageScore.toFixed(1)}%</Text>
          </div>
        ))}
      </Card>
    </Col>
  </Row>
);


const ExamAnalysis = () => {
  const [data] = useState(mockApiData);

  return (
    <div className="page-wrapper">
      <div className="content">
        <Layout className="min-h-screen bg-gray-50">
          <Content className="p-6 mt-4">
            <PageTitle />
            <Filters />
            <SummaryWidgets data={data.summary} />
            <Row gutter={[24, 24]} className="mb-6">
              <Col xs={24} lg={12}>
                <PerformanceByClassChart data={data.performanceByClass} />
              </Col>
              <Col xs={24} lg={12}>
                <PerformanceBySubjectChart data={data.performanceBySubject} />
              </Col>
            </Row>
            <Row gutter={[24, 24]} className="mb-6">
              <Col span={24}>
                <PerformanceByGenderChart data={data.performanceByGender} />
              </Col>
            </Row>
            <Row gutter={[24, 24]} className="mb-6">
              <Col span={24}>
                <StudentLists top={data.topStudents} watch={data.studentsToWatch} />
              </Col>
            </Row>
          </Content>
        </Layout>
      </div>
    </div>
  );
};

export default ExamAnalysis;
