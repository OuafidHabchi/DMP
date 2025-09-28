exports.createTemplate = async (req, res) => {
  try {
    const ViolationTemplate = req.connection.models.DailyViolationTemplate;
    const { type, link, description } = req.body;
    if (!type) {
      return res.status(400).json({ error: 'Type is required.' });
    }

    const template = new ViolationTemplate({
      type,
      link: link || '',
      description: description || '',
    });

    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: 'Error creating template.', details: err.message });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const ViolationTemplate = req.connection.models.DailyViolationTemplate;
    const templates = await ViolationTemplate.find().sort({ createdAt: -1 });
    res.status(200).json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching templates.', details: err.message });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const ViolationTemplate = req.connection.models.DailyViolationTemplate;
    const { id } = req.params;
    const { type, link, description } = req.body;

    const updated = await ViolationTemplate.findByIdAndUpdate(
      id,
      { type, link, description },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error updating template.', details: err.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const ViolationTemplate = req.connection.models.DailyViolationTemplate;
    const { id } = req.params;

    const deleted = await ViolationTemplate.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    res.status(200).json({ message: 'Template deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting template.', details: err.message });
  }
};
